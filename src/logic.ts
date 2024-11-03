import { physics } from "propel-js"
import type { GameOverResult, PlayerId, RuneClient } from "rune-sdk"

export const TABLE_WIDTH = 250
export const TABLE_HEIGHT = 140
export const BALL_SIZE = 4
export const RED = "#F00"
export const YELLOW = "#FF0"
export const BLACK = "#000"
export const WHITE = "white"
export const POWER_SCALE = 3
export const MIN_POWER = 50
export const COMPUTER_ID = "computer"

export type GameEvent = {
  id: number
  type: "potted" | "foul"
  data: string
}

export type Cells = (PlayerId | null)[]
export interface GameState {
  startGame: boolean
  world: physics.World
  cueBallId: number
  whoseTurn: PlayerId
  playerCols: Record<PlayerId, string>
  potted: string[]
  shotsRemaining: number
  events: GameEvent[]
  firstHitBall?: string
  nextEventId: number
  shot: boolean
  computerIndex: number
}

type GameActions = {
  shot: (dir: { x: number; y: number }) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

function createCushion(
  world: physics.World,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const cushion = physics.createRectangle(
    world,
    { x: x + width / 2, y: y + height / 2 },
    width,
    height,
    0,
    0,
    0.9
  )
  physics.addBody(world, cushion)
}

function pottedBlackWonGame(winner: string, other: string) {
  const players: Record<PlayerId, GameOverResult> = {
    [winner]: "WON",
    [other]: "LOST",
  }
  delete players[COMPUTER_ID]
  Rune.gameOver({
    players,
  })
}
function pottedBlackGameOver(loser: string, other: string) {
  const players: Record<PlayerId, GameOverResult> = {
    [loser]: "LOST",
    [other]: "WON",
  }
  delete players[COMPUTER_ID]

  Rune.gameOver({
    players,
  })
}

function createTable(world: physics.World) {
  createCushion(
    world,
    TABLE_WIDTH * 0.04,
    -TABLE_HEIGHT * 0.01,
    TABLE_WIDTH * 0.42,
    TABLE_HEIGHT * 0.06
  )
  createCushion(
    world,
    TABLE_WIDTH * 0.54,
    -TABLE_HEIGHT * 0.01,
    TABLE_WIDTH * 0.41,
    TABLE_HEIGHT * 0.06
  )
  createCushion(
    world,
    TABLE_WIDTH * 0.04,
    TABLE_HEIGHT * 0.915,
    TABLE_WIDTH * 0.42,
    TABLE_HEIGHT * 0.06
  )
  createCushion(
    world,
    TABLE_WIDTH * 0.54,
    TABLE_HEIGHT * 0.915,
    TABLE_WIDTH * 0.41,
    TABLE_HEIGHT * 0.06
  )
  createCushion(
    world,
    -TABLE_WIDTH / 30,
    TABLE_HEIGHT * 0.105,
    TABLE_WIDTH / 20,
    TABLE_HEIGHT * 0.76
  )
  createCushion(
    world,
    TABLE_WIDTH - TABLE_WIDTH / 40,
    TABLE_HEIGHT * 0.105,
    TABLE_WIDTH / 20,
    TABLE_HEIGHT * 0.76
  )

  const p1 = physics.createCircle(
    world,
    { x: -TABLE_WIDTH * 0.01, y: TABLE_HEIGHT * 0.02 },
    TABLE_WIDTH / 30,
    0,
    0,
    0,
    true
  )
  physics.addBody(world, p1)
  const p2 = physics.createCircle(
    world,
    { x: -TABLE_WIDTH * 0.01, y: TABLE_HEIGHT * 0.94 },
    TABLE_WIDTH / 30,
    0,
    0,
    0,
    true
  )
  physics.addBody(world, p2)
  const p3 = physics.createCircle(
    world,
    { x: TABLE_WIDTH * 1, y: TABLE_HEIGHT * 0.02 },
    TABLE_WIDTH / 30,
    0,
    0,
    0,
    true
  )
  physics.addBody(world, p3)
  const p4 = physics.createCircle(
    world,
    { x: TABLE_WIDTH * 1, y: TABLE_HEIGHT * 0.94 },
    TABLE_WIDTH / 30,
    0,
    0,
    0,
    true
  )
  physics.addBody(world, p4)
  const p5 = physics.createCircle(
    world,
    { x: TABLE_WIDTH * 0.498, y: TABLE_HEIGHT * 0.01 },
    TABLE_WIDTH / 35,
    0,
    0,
    0,
    true
  )
  physics.addBody(world, p5)
  const p6 = physics.createCircle(
    world,
    { x: TABLE_WIDTH * 0.498, y: TABLE_HEIGHT * 0.97 },
    TABLE_WIDTH / 35,
    0,
    0,
    0,
    true
  )
  physics.addBody(world, p6)
}

function takeShot(
  dir: { x: number; y: number },
  game: GameState,
  playerId: PlayerId
) {
  if (!physics.atRest(game.world)) {
    return
  }
  if (game.whoseTurn !== playerId) {
    return
  }
  game.shot = true

  const cueBall = game.world.dynamicBodies.find((b) => b.id === game.cueBallId)
  if (cueBall) {
    physics.applyVelocity(cueBall, {
      x: dir.x * POWER_SCALE,
      y: dir.y * POWER_SCALE,
    })
  }
}

function runComputerTurn(game: GameState) {
  const angle = Math.random() * Math.PI * 2
  const power = 150
  const dir = { x: Math.cos(angle) * power, y: Math.sin(angle) * power }
  takeShot(dir, game, COMPUTER_ID)
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 2,
  landscape: true,
  setup: (allPlayerIds) => {
    const world = physics.createWorld({ x: 0, y: 0 }, 0.25)
    const cueBall: physics.DynamicRigidBody = physics.createCircle(
      world,
      { x: TABLE_WIDTH / 6, y: TABLE_HEIGHT / 2 },
      BALL_SIZE,
      1,
      1,
      1
    ) as physics.DynamicRigidBody
    cueBall.data = WHITE
    physics.addBody(world, cueBall)

    createTable(world)

    const state: GameState = {
      startGame: true,
      world,
      cueBallId: cueBall.id,
      playerCols: {},
      whoseTurn: allPlayerIds[0],
      potted: [],
      shotsRemaining: 1,
      events: [],
      nextEventId: 1,
      shot: false,
      computerIndex: 0,
    }

    const order = [
      YELLOW,
      RED,
      YELLOW,
      YELLOW,
      BLACK,
      RED,
      RED,
      YELLOW,
      RED,
      YELLOW,
      YELLOW,
      RED,
      RED,
      YELLOW,
      RED,
    ]
    let index = 0
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j <= i; j++) {
        const ball = physics.createCircle(
          state.world,
          {
            x: TABLE_WIDTH * 0.6 + i * BALL_SIZE * 2,
            y: -(i * BALL_SIZE) + j * BALL_SIZE * 2 + TABLE_HEIGHT / 2,
          },
          BALL_SIZE,
          1,
          0,
          1
        )
        ball.data = order[index]
        index++
        physics.addBody(state.world, ball)
      }
    }
    return state
  },
  updatesPerSecond: 30,
  reactive: false,
  update: ({ game, allPlayerIds }) => {
    game.events = []
    game.startGame = false
    if (physics.atRest(game.world)) {
      if (game.whoseTurn === COMPUTER_ID) {
        runComputerTurn(game)
      }
      return
    }

    const collisions = physics.worldStep(60, game.world)
    collisions.push(...physics.worldStep(60, game.world))

    // look for ball collisions
    for (const col of collisions) {
      if (col.bodyAId === game.cueBallId) {
        const otherBall = game.world.dynamicBodies.find(
          (b) => b.id === col.bodyBId
        )
        if (otherBall) {
          game.firstHitBall = otherBall.data
        }
      }
      if (col.bodyBId === game.cueBallId) {
        const otherBall = game.world.dynamicBodies.find(
          (b) => b.id === col.bodyAId
        )
        if (otherBall) {
          game.firstHitBall = otherBall.data
        }
      }
    }
    const pockets = game.world.staticBodies.filter((s) => s.shapes[0].sensor)
    for (const pocket of pockets) {
      const shape = pocket.shapes[0]
      if (shape.sensorColliding) {
        for (const collision of shape.sensorCollisions) {
          const ball = game.world.dynamicBodies.find(
            (b) => b.shapes[0].id === collision
          )
          if (ball) {
            physics.removeBody(game.world, ball)
            // ball potted
            game.potted.push(ball.data)
            game.events.push({
              id: game.nextEventId++,
              type: "potted",
              data: ball.data,
            })
          }
        }
      }
    }
    // fake the table resistence
    const friction = 0.98
    const minVelocity = 1
    for (const body of game.world.dynamicBodies) {
      body.velocity.x *= friction
      body.velocity.y *= friction
      if (Math.abs(body.velocity.x) < minVelocity) {
        body.velocity.x = 0
      }
      if (Math.abs(body.velocity.y) < minVelocity) {
        body.velocity.y = 0
      }
    }

    if (physics.atRest(game.world) && game.shot) {
      game.shotsRemaining--

      // evaluate the game now the world has come to rest
      const currentCol = game.playerCols[game.whoseTurn]
      const otherPlayers = allPlayerIds.filter((i) => i !== game.whoseTurn)
      const otherPlayer =
        otherPlayers.length > 0 ? otherPlayers[0] : COMPUTER_ID

      const pottedWhite = game.potted.includes(WHITE)

      if (pottedWhite) {
        const cueBall: physics.DynamicRigidBody = physics.createCircle(
          game.world,
          { x: TABLE_WIDTH / 6, y: TABLE_HEIGHT / 2 },
          BALL_SIZE,
          1,
          1,
          1
        ) as physics.DynamicRigidBody
        cueBall.data = WHITE
        physics.addBody(game.world, cueBall)
        game.cueBallId = cueBall.id
        game.shot = false

        game.whoseTurn = otherPlayer
        game.shotsRemaining = 2
        game.events.push({ id: game.nextEventId++, type: "foul", data: "" })
      } else {
        if (!currentCol) {
          if (game.potted.includes(BLACK)) {
            // game over, you just potted the black
            pottedBlackGameOver(game.whoseTurn, otherPlayer)
          } else if (game.potted.includes(RED)) {
            game.playerCols[game.whoseTurn] = RED
            game.playerCols[otherPlayer] = YELLOW
            game.shotsRemaining = 1
          } else if (game.potted.includes(YELLOW)) {
            game.playerCols[game.whoseTurn] = YELLOW
            game.playerCols[otherPlayer] = RED
            game.shotsRemaining = 1
          }
        } else if (currentCol === RED) {
          const remainingBalls = game.world.dynamicBodies.filter(
            (b) => b.data === RED
          ).length
          if (game.potted.includes(BLACK)) {
            if (remainingBalls > 0) {
              pottedBlackGameOver(game.whoseTurn, otherPlayer)
            } else {
              pottedBlackWonGame(game.whoseTurn, otherPlayer)
            }
          } else if (game.potted.includes(YELLOW)) {
            // foul
            game.whoseTurn = otherPlayer
            game.shotsRemaining = 2
            game.events.push({ id: game.nextEventId++, type: "foul", data: "" })
          } else if (game.potted.includes(RED)) {
            game.shotsRemaining++
          }
        } else if (currentCol === YELLOW) {
          const remainingBalls = game.world.dynamicBodies.filter(
            (b) => b.data === YELLOW
          ).length
          if (game.potted.includes(BLACK)) {
            if (remainingBalls > 0) {
              pottedBlackGameOver(game.whoseTurn, otherPlayer)
            } else {
              pottedBlackWonGame(game.whoseTurn, otherPlayer)
            }
          } else if (game.potted.includes(RED)) {
            // foul
            game.whoseTurn = otherPlayer
            game.shotsRemaining = 2
            game.events.push({ id: game.nextEventId++, type: "foul", data: "" })
          } else if (game.potted.includes(YELLOW)) {
            game.shotsRemaining++
          }
        }

        if (!game.firstHitBall) {
          // didn't hit anything foul
          game.whoseTurn = otherPlayer
          game.shotsRemaining = 2
          game.events.push({ id: game.nextEventId++, type: "foul", data: "" })
        } else if (game.firstHitBall !== currentCol && currentCol) {
          // hit the wrong ball, foul
          game.whoseTurn = otherPlayer
          game.shotsRemaining = 2
          game.events.push({ id: game.nextEventId++, type: "foul", data: "" })
        }
      }

      // reset turn
      game.potted = []
      game.firstHitBall = undefined
      if (game.shotsRemaining <= 0) {
        game.whoseTurn = otherPlayer
        game.shotsRemaining = 1
      }
      if (game.whoseTurn == COMPUTER_ID) {
        game.computerIndex = 0
      }
    }
  },
  events: {
    playerJoined: (playerId, { game }) => {
      game.playerCols[playerId] = game.playerCols[COMPUTER_ID]
      if (game.whoseTurn === COMPUTER_ID) {
        game.whoseTurn = playerId
      }
    },
    playerLeft: (playerId, { game }) => {
      game.playerCols[COMPUTER_ID] = game.playerCols[playerId]
      if (game.whoseTurn === playerId) {
        game.whoseTurn = COMPUTER_ID
      }
    },
  },
  actions: {
    shot: (dir, { game, playerId }) => {
      takeShot(dir, game, playerId)
    },
  },
})
