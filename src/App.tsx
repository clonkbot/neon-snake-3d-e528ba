import { useState, useEffect, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Float, Text, MeshWobbleMaterial, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Game constants
const GRID_SIZE = 15
const CELL_SIZE = 1
const INITIAL_SPEED = 200

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Position = { x: number; z: number }

// Glowing snake segment
function SnakeSegment({ position, isHead, index }: { position: Position; isHead: boolean; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const baseY = isHead ? 0.6 : 0.4

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 3 + index * 0.5) * 0.1
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[
        position.x * CELL_SIZE - (GRID_SIZE * CELL_SIZE) / 2 + 0.5,
        baseY,
        position.z * CELL_SIZE - (GRID_SIZE * CELL_SIZE) / 2 + 0.5
      ]}
      castShadow
    >
      {isHead ? (
        <sphereGeometry args={[0.45, 32, 32]} />
      ) : (
        <boxGeometry args={[0.7, 0.7, 0.7]} />
      )}
      <meshStandardMaterial
        color={isHead ? '#00ffff' : '#00cccc'}
        emissive={isHead ? '#00ffff' : '#00aaaa'}
        emissiveIntensity={isHead ? 2 : 1.2}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

// Glowing food
function Food({ position }: { position: Position }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.3
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.2
    }
  })

  return (
    <Float speed={4} rotationIntensity={0.5} floatIntensity={1}>
      <mesh
        ref={meshRef}
        position={[
          position.x * CELL_SIZE - (GRID_SIZE * CELL_SIZE) / 2 + 0.5,
          0.5,
          position.z * CELL_SIZE - (GRID_SIZE * CELL_SIZE) / 2 + 0.5
        ]}
      >
        <octahedronGeometry args={[0.4, 0]} />
        <MeshWobbleMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={2}
          factor={0.4}
          speed={3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  )
}

// Neon grid floor
function NeonGrid() {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Grid lines */}
      {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
        <group key={i}>
          {/* Horizontal lines */}
          <mesh position={[0, 0.01, i - GRID_SIZE / 2]}>
            <boxGeometry args={[GRID_SIZE, 0.02, 0.03]} />
            <meshStandardMaterial
              color="#6b21a8"
              emissive="#6b21a8"
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* Vertical lines */}
          <mesh position={[i - GRID_SIZE / 2, 0.01, 0]}>
            <boxGeometry args={[0.03, 0.02, GRID_SIZE]} />
            <meshStandardMaterial
              color="#6b21a8"
              emissive="#6b21a8"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Border walls */}
      {[
        { pos: [0, 0.3, -GRID_SIZE / 2 - 0.15], scale: [GRID_SIZE + 0.3, 0.6, 0.3] },
        { pos: [0, 0.3, GRID_SIZE / 2 + 0.15], scale: [GRID_SIZE + 0.3, 0.6, 0.3] },
        { pos: [-GRID_SIZE / 2 - 0.15, 0.3, 0], scale: [0.3, 0.6, GRID_SIZE + 0.3] },
        { pos: [GRID_SIZE / 2 + 0.15, 0.3, 0], scale: [0.3, 0.6, GRID_SIZE + 0.3] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos as [number, number, number]}>
          <boxGeometry args={wall.scale as [number, number, number]} />
          <meshStandardMaterial
            color="#1a1a2e"
            emissive="#4a1a6b"
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

// 3D Score display floating in scene
function ScoreDisplay({ score }: { score: number }) {
  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <Text
        position={[0, 8, -GRID_SIZE / 2 - 2]}
        fontSize={1.5}
        color="#ffff00"
        anchorX="center"
        anchorY="middle"
        font="/fonts/VT323-Regular.ttf"
        outlineWidth={0.05}
        outlineColor="#ff8800"
      >
        {`SCORE: ${score}`}
        <meshStandardMaterial
          emissive="#ffff00"
          emissiveIntensity={2}
        />
      </Text>
    </Float>
  )
}

// Game Over overlay in 3D
function GameOver3D({ score, onRestart }: { score: number; onRestart: () => void }) {
  return (
    <group position={[0, 3, 0]}>
      <Text
        position={[0, 1.5, 0]}
        fontSize={2}
        color="#ff0000"
        anchorX="center"
        anchorY="middle"
      >
        GAME OVER
        <meshStandardMaterial emissive="#ff0000" emissiveIntensity={3} />
      </Text>
      <Text
        position={[0, 0, 0]}
        fontSize={1}
        color="#ffff00"
        anchorX="center"
        anchorY="middle"
      >
        {`Final Score: ${score}`}
        <meshStandardMaterial emissive="#ffff00" emissiveIntensity={2} />
      </Text>
      <Html position={[0, -1.5, 0]} center>
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xl rounded-lg
                     hover:from-cyan-400 hover:to-purple-500 transition-all duration-300
                     shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_50px_rgba(0,255,255,0.8)]
                     border-2 border-cyan-400 hover:scale-110"
          style={{ fontFamily: 'VT323, monospace' }}
        >
          PLAY AGAIN
        </button>
      </Html>
    </group>
  )
}

// Main game scene
function GameScene({
  snake,
  food,
  gameOver,
  score,
  onRestart
}: {
  snake: Position[]
  food: Position
  gameOver: boolean
  score: number
  onRestart: () => void
}) {
  return (
    <>
      <color attach="background" args={['#050510']} />

      {/* Camera and controls */}
      <OrbitControls
        enablePan={false}
        minDistance={12}
        maxDistance={30}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 15, 0]} intensity={1.5} color="#ffffff" />
      <pointLight position={[10, 8, 10]} intensity={0.8} color="#00ffff" />
      <pointLight position={[-10, 8, -10]} intensity={0.8} color="#ff00ff" />
      <spotLight
        position={[0, 20, 0]}
        angle={0.5}
        penumbra={0.5}
        intensity={1}
        color="#6b21a8"
        castShadow
      />

      {/* Environment */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      {/* Game elements */}
      <NeonGrid />

      {snake.map((segment, index) => (
        <SnakeSegment
          key={`${segment.x}-${segment.z}-${index}`}
          position={segment}
          isHead={index === 0}
          index={index}
        />
      ))}

      <Food position={food} />
      <ScoreDisplay score={score} />

      {gameOver && <GameOver3D score={score} onRestart={onRestart} />}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// Mobile controls component
function MobileControls({ onDirection }: { onDirection: (dir: Direction) => void }) {
  const buttonClass = `w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-purple-900/80 to-cyan-900/80
                       border-2 border-cyan-400/50 text-cyan-300 text-2xl font-bold
                       active:scale-95 active:from-cyan-600/80 active:to-purple-600/80
                       shadow-[0_0_15px_rgba(0,255,255,0.3)] backdrop-blur-sm
                       flex items-center justify-center touch-none select-none`

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:hidden z-20">
      <button className={buttonClass} onClick={() => onDirection('UP')}>↑</button>
      <div className="flex gap-2">
        <button className={buttonClass} onClick={() => onDirection('LEFT')}>←</button>
        <button className={buttonClass} onClick={() => onDirection('DOWN')}>↓</button>
        <button className={buttonClass} onClick={() => onDirection('RIGHT')}>→</button>
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [snake, setSnake] = useState<Position[]>([
    { x: 7, z: 7 },
    { x: 6, z: 7 },
    { x: 5, z: 7 },
  ])
  const [food, setFood] = useState<Position>({ x: 10, z: 10 })
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [speed, setSpeed] = useState(INITIAL_SPEED)

  const directionRef = useRef(direction)
  directionRef.current = direction

  // Generate random food position
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        z: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (currentSnake.some(seg => seg.x === newFood.x && seg.z === newFood.z))
    return newFood
  }, [])

  // Handle direction change
  const handleDirection = useCallback((newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    }
    if (opposites[newDir] !== directionRef.current) {
      setDirection(newDir)
    }
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted && !gameOver) {
        setGameStarted(true)
      }

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
        W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
      }

      if (keyMap[e.key]) {
        e.preventDefault()
        handleDirection(keyMap[e.key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted, gameOver, handleDirection])

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] }

        switch (directionRef.current) {
          case 'UP': head.z -= 1; break
          case 'DOWN': head.z += 1; break
          case 'LEFT': head.x -= 1; break
          case 'RIGHT': head.x += 1; break
        }

        // Check wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.z < 0 || head.z >= GRID_SIZE) {
          setGameOver(true)
          return prevSnake
        }

        // Check self collision
        if (prevSnake.some(seg => seg.x === head.x && seg.z === head.z)) {
          setGameOver(true)
          return prevSnake
        }

        const newSnake = [head, ...prevSnake]

        // Check food collision
        if (head.x === food.x && head.z === food.z) {
          setScore(prev => prev + 10)
          setFood(generateFood(newSnake))
          setSpeed(prev => Math.max(prev - 5, 80)) // Speed up
          return newSnake
        }

        newSnake.pop()
        return newSnake
      })
    }, speed)

    return () => clearInterval(gameLoop)
  }, [gameStarted, gameOver, food, speed, generateFood])

  // Restart game
  const restartGame = useCallback(() => {
    setSnake([
      { x: 7, z: 7 },
      { x: 6, z: 7 },
      { x: 5, z: 7 },
    ])
    setFood({ x: 10, z: 10 })
    setDirection('RIGHT')
    setGameOver(false)
    setScore(0)
    setSpeed(INITIAL_SPEED)
    setGameStarted(true)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050510]">
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [15, 18, 15], fov: 50 }}
        gl={{ antialias: true }}
      >
        <GameScene
          snake={snake}
          food={food}
          gameOver={gameOver}
          score={score}
          onRestart={restartGame}
        />
      </Canvas>

      {/* Start screen overlay */}
      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 px-4">
          <h1
            className="text-5xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500
                       animate-pulse tracking-wider mb-8"
            style={{ fontFamily: 'VT323, monospace' }}
          >
            NEON SNAKE
          </h1>
          <p className="text-cyan-300 text-lg md:text-2xl mb-4 text-center" style={{ fontFamily: 'VT323, monospace' }}>
            Use Arrow Keys or WASD to move
          </p>
          <p className="text-purple-400 text-base md:text-xl mb-8" style={{ fontFamily: 'VT323, monospace' }}>
            Press any key to start
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setGameStarted(true)}
              className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xl md:text-2xl rounded-xl
                         hover:from-cyan-400 hover:to-purple-500 transition-all duration-300
                         shadow-[0_0_40px_rgba(0,255,255,0.6)] hover:shadow-[0_0_60px_rgba(0,255,255,0.9)]
                         border-2 border-cyan-400 hover:scale-110 animate-bounce"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {gameStarted && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <div
            className="text-2xl md:text-4xl text-cyan-300 tracking-widest"
            style={{ fontFamily: 'VT323, monospace', textShadow: '0 0 20px rgba(0,255,255,0.8)' }}
          >
            SCORE: <span className="text-yellow-300">{score}</span>
          </div>
        </div>
      )}

      {/* Controls hint - desktop only */}
      <div className="hidden md:block absolute top-6 right-6 z-10">
        <div
          className="text-purple-300 text-sm opacity-70"
          style={{ fontFamily: 'VT323, monospace' }}
        >
          WASD / Arrow Keys to move<br />
          Drag to rotate camera
        </div>
      </div>

      {/* Mobile controls */}
      {gameStarted && !gameOver && (
        <MobileControls onDirection={handleDirection} />
      )}

      {/* Footer */}
      <footer
        className="absolute bottom-3 left-0 right-0 text-center text-xs md:text-sm z-10"
        style={{ fontFamily: 'VT323, monospace' }}
      >
        <span className="text-purple-400/60">
          Requested by <span className="text-cyan-400/80">@web-user</span> · Built by <span className="text-pink-400/80">@clonkbot</span>
        </span>
      </footer>
    </div>
  )
}
