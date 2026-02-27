"use client";

import { useEffect, useRef, useState } from "react";

const GRID_SIZE = 20;
const TILE_COUNT = 20;

type Position = {
  x: number;
  y: number;
};

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const snake = useRef<Position[]>([{ x: 10, y: 10 }]);
  const direction = useRef<Position>({ x: 0, y: 0 });
  const nextDirection = useRef<Position>({ x: 0, y: 0 });
  const food = useRef<Position>({ x: 5, y: 5 });

  const lastUpdateTime = useRef(0);
  const speed = useRef(120);
  const hueRef = useRef(120);

  const eatAudioRef = useRef<HTMLAudioElement | null>(null);
  const endAudioRef = useRef<HTMLAudioElement | null>(null);

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");

  /* ================= SPEED ================= */

  const getSpeedByDifficulty = () => {
    switch (difficulty) {
      case "easy":
        return 160;
      case "medium":
        return 120;
      case "hard":
        return 80;
      default:
        return 120;
    }
  };

  /* ================= LOAD HIGH SCORE ================= */

  useEffect(() => {
    const saved = localStorage.getItem("snake-high-score");
    if (saved) setHighScore(Number(saved));
  }, []);

  /* ================= RESET GAME ================= */

  const resetGame = () => {
    snake.current = [{ x: 10, y: 10 }];
    direction.current = { x: 0, y: 0 };
    nextDirection.current = { x: 0, y: 0 };
    food.current = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT),
    };
    speed.current = getSpeedByDifficulty();
    hueRef.current = 120;
    lastUpdateTime.current = 0;

    setScore(0);
    setGameOver(false);
    setPaused(false);
  };

  /* ================= CONTROLS ================= */

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver || paused) return;

      let newDir: Position | null = null;

      switch (e.key) {
        case "ArrowUp":
          if (direction.current.y !== 1) newDir = { x: 0, y: -1 };
          break;
        case "ArrowDown":
          if (direction.current.y !== -1) newDir = { x: 0, y: 1 };
          break;
        case "ArrowLeft":
          if (direction.current.x !== 1) newDir = { x: -1, y: 0 };
          break;
        case "ArrowRight":
          if (direction.current.x !== -1) newDir = { x: 1, y: 0 };
          break;
      }

      if (newDir) nextDirection.current = newDir;
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameStarted, gameOver, paused]);

  /* ================= GAME LOOP ================= */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = (time: number) => {
      if (!gameOver && gameStarted && !paused) {
        if (time - lastUpdateTime.current > speed.current) {
          updateGame();
          lastUpdateTime.current = time;
        }
      }

      draw(ctx);
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameStarted, gameOver, paused]);

  /* ================= GAME LOGIC ================= */

  const updateGame = () => {
    direction.current = nextDirection.current;

    if (direction.current.x === 0 && direction.current.y === 0) return;

    const head = {
      x: snake.current[0].x + direction.current.x,
      y: snake.current[0].y + direction.current.y,
    };

    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= TILE_COUNT ||
      head.y >= TILE_COUNT ||
      snake.current.some((seg) => seg.x === head.x && seg.y === head.y)
    ) {
      endGame();
      return;
    }

    snake.current.unshift(head);

    if (head.x === food.current.x && head.y === food.current.y) {
      setScore((prev) => {
        const newScore = prev + 1;

        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem("snake-high-score", String(newScore));
        }

        return newScore;
      });

      hueRef.current = (hueRef.current + 30) % 360;

      if (eatAudioRef.current) {
        eatAudioRef.current.currentTime = 0;
        eatAudioRef.current.play().catch(() => {});
      }

      food.current = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT),
      };
    } else {
      snake.current.pop();
    }
  };

  /* ================= DRAW ================= */

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    /* ================= FRUIT ================= */

    const fx = food.current.x * GRID_SIZE + GRID_SIZE / 2;
    const fy = food.current.y * GRID_SIZE + GRID_SIZE / 2;

    const fruitGradient = ctx.createRadialGradient(
      fx - 4,
      fy - 4,
      2,
      fx,
      fy,
      GRID_SIZE / 2,
    );

    fruitGradient.addColorStop(0, "#ff9a9e");
    fruitGradient.addColorStop(0.5, "#ff3d3d");
    fruitGradient.addColorStop(1, "#8b0000");

    ctx.beginPath();
    ctx.arc(fx, fy, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = fruitGradient;
    ctx.fill();

    /* ================= SNAKE BODY ================= */

    if (snake.current.length > 1) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = GRID_SIZE - 4;

      const gradient = ctx.createLinearGradient(
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
      );

      gradient.addColorStop(0, `hsl(${hueRef.current}, 80%, 55%)`);
      gradient.addColorStop(1, `hsl(${(hueRef.current + 60) % 360}, 80%, 45%)`);

      ctx.strokeStyle = gradient;

      ctx.beginPath();
      snake.current.forEach((segment, i) => {
        const x = segment.x * GRID_SIZE + GRID_SIZE / 2;
        const y = segment.y * GRID_SIZE + GRID_SIZE / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }

    /* ================= SNAKE HEAD (ALWAYS DRAW) ================= */

    const head = snake.current[0];
    const hx = head.x * GRID_SIZE + GRID_SIZE / 2;
    const hy = head.y * GRID_SIZE + GRID_SIZE / 2;

    const headGradient = ctx.createRadialGradient(
      hx - 3,
      hy - 3,
      2,
      hx,
      hy,
      GRID_SIZE / 2,
    );

    headGradient.addColorStop(0, "#6dff8f");
    headGradient.addColorStop(1, "#0ea84a");

    ctx.beginPath();
    ctx.arc(hx, hy, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = headGradient;
    ctx.fill();

    /* ================= EYES ================= */

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(hx - 4, hy - 3, 3, 0, Math.PI * 2);
    ctx.arc(hx + 4, hy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(hx - 4, hy - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(hx + 4, hy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  };

  /* ================= END ================= */

  const endGame = () => {
    setGameOver(true);

    if (endAudioRef.current) {
      endAudioRef.current.currentTime = 0;
      endAudioRef.current.play().catch(() => {});
    }
  };

  /* ================= UI ================= */

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <audio ref={eatAudioRef} src="/sounds/eat.mp3" />
      <audio ref={endAudioRef} src="/sounds/end.mp3" />

      <h1 className="text-4xl font-bold mb-4">🐍 Snake Game</h1>

      {!gameStarted ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            {["easy", "medium", "hard"].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-4 py-2 rounded capitalize ${
                  difficulty === level ? "bg-green-500" : "bg-gray-700"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              resetGame();
              setGameStarted(true);
            }}
            className="bg-white text-black px-6 py-2 rounded text-lg"
          >
            Start Game
          </button>
        </div>
      ) : (
        <>
          <p>Score: {score}</p>
          <p className="text-yellow-400 mb-2">High Score: {highScore}</p>

          <canvas
            ref={canvasRef}
            width={GRID_SIZE * TILE_COUNT}
            height={GRID_SIZE * TILE_COUNT}
            className="border border-gray-600 rounded"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setPaused(!paused)}
              className="bg-yellow-500 px-4 py-2 rounded text-black"
            >
              {paused ? "Play" : "Pause"}
            </button>

            <button
              onClick={resetGame}
              className="bg-white text-black px-4 py-2 rounded"
            >
              Restart
            </button>

            <button
              onClick={() => {
                resetGame();
                setGameStarted(false);
              }}
              className="bg-gray-600 px-4 py-2 rounded"
            >
              Back
            </button>
          </div>

          {gameOver && <p className="text-red-500 text-xl mt-3">Game Over</p>}
        </>
      )}
    </div>
  );
}
