"use client";

import { useEffect, useRef, useState } from "react";

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
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const eatAudioRef = useRef<HTMLAudioElement | null>(null);
  const endAudioRef = useRef<HTMLAudioElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [canvasSize, setCanvasSize] = useState(400);

  /* ================= RESPONSIVE CANVAS ================= */

  useEffect(() => {
    const updateSize = () => {
      const size = Math.min(window.innerWidth - 20, 500);
      setCanvasSize(size);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

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

  /* ================= RESET ================= */

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

  /* ================= KEYBOARD CONTROLS ================= */

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver || paused) return;

      switch (e.key) {
        case "ArrowUp":
          if (direction.current.y !== 1)
            nextDirection.current = { x: 0, y: -1 };
          break;
        case "ArrowDown":
          if (direction.current.y !== -1)
            nextDirection.current = { x: 0, y: 1 };
          break;
        case "ArrowLeft":
          if (direction.current.x !== 1)
            nextDirection.current = { x: -1, y: 0 };
          break;
        case "ArrowRight":
          if (direction.current.x !== -1)
            nextDirection.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameStarted, gameOver, paused]);

  /* ================= TOUCH CONTROLS ================= */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && direction.current.x !== -1)
          nextDirection.current = { x: 1, y: 0 };
        else if (dx < 0 && direction.current.x !== 1)
          nextDirection.current = { x: -1, y: 0 };
      } else {
        if (dy > 0 && direction.current.y !== -1)
          nextDirection.current = { x: 0, y: 1 };
        else if (dy < 0 && direction.current.y !== 1)
          nextDirection.current = { x: 0, y: -1 };
      }

      touchStart.current = null;
    };

    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

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
      setGameOver(true);
      endAudioRef.current?.play().catch(() => {});
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

      eatAudioRef.current?.play().catch(() => {});
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
    const GRID = ctx.canvas.width / TILE_COUNT;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // FOOD
    const fx = food.current.x * GRID + GRID / 2;
    const fy = food.current.y * GRID + GRID / 2;

    ctx.beginPath();
    ctx.arc(fx, fy, GRID / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();

    // SNAKE
    ctx.fillStyle = "#22c55e";
    snake.current.forEach((segment) => {
      ctx.fillRect(
        segment.x * GRID,
        segment.y * GRID,
        GRID - 2,
        GRID - 2
      );
    });
  };

  /* ================= UI ================= */

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-2">
      <audio ref={eatAudioRef} src="/sounds/eat.mp3" />
      <audio ref={endAudioRef} src="/sounds/end.mp3" />

      <h1 className="text-3xl font-bold mb-4 text-center">🐍 Snake Game</h1>

      {!gameStarted ? (
        <button
          onClick={() => {
            resetGame();
            setGameStarted(true);
          }}
          className="bg-white text-black px-6 py-2 rounded text-lg"
        >
          Start Game
        </button>
      ) : (
        <>
          <p>Score: {score}</p>
          <p className="text-yellow-400 mb-2">
            High Score: {highScore}
          </p>

          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="border border-gray-600 rounded touch-none w-full max-w-[500px]"
          />

          <div className="mt-4 flex gap-3 flex-wrap justify-center">
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
          </div>

          {gameOver && (
            <p className="text-red-500 text-xl mt-3">
              Game Over
            </p>
          )}
        </>
      )}
    </div>
  );
}