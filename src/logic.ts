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
export const COMPUTER_FRAMES_PER_LOGIC_FRAME = 20
export const COMPUTER_ANGLE_STEP = Math.floor(360 / 25)
export const COMPUTER_SIM_TIME_FRAMES = 60 // 2 seconds

export type GameEvent = {
  id: number
  type: "potted" | "foul" | "shot"
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
  computerWorld: physics.World
  computerStep: number
  computerFirstHitBall?: string
  computerMoveRating: number
  computerMovePower: number
  computerMoveAngle: number
  computerMoveColor?: string
  computerBestResult?: string
  computerMoveResult?: string
  computerBestAngle: number
  computerBestRating: number
  computerBestPower: number
  computerTakeShotAt: number
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
  game.events.push({ id: game.nextEventId++, type: "shot", data: "" })
  game.shot = true

  const cueBall = game.world.dynamicBodies.find((b) => b.id === game.cueBallId)
  if (cueBall) {
    physics.applyVelocity(cueBall, {
      x: dir.x * POWER_SCALE,
      y: dir.y * POWER_SCALE,
    })
  }
}

function takeComputerShot(game: GameState) {
  // take shot - if nothing identified random shot
  if (game.computerBestRating === 0) {
    const angle = Math.random() * Math.PI * 2
    const power = 150
    const dir = { x: Math.cos(angle) * power, y: Math.sin(angle) * power }
    takeShot(dir, game, COMPUTER_ID)
  } else {
    const angle = game.computerBestAngle
    const power = game.computerBestPower
    const dir = { x: Math.cos(angle) * power, y: Math.sin(angle) * power }
    takeShot(dir, game, COMPUTER_ID)
  }
}

function runComputerTurn(game: GameState) {
  if (game.computerIndex >= 360) {
    game.computerTakeShotAt = Rune.gameTime() + 1000
  } else {
    // copy the world to try out a shot
    if (game.computerStep === 0) {
      game.computerWorld = JSON.parse(JSON.stringify(game.world))
      game.computerFirstHitBall = undefined
      game.computerMoveRating = 0
      game.computerMoveColor = game.playerCols[COMPUTER_ID]
      game.computerMoveResult = "NO RESULT"

      const angle = (game.computerIndex / 360) * Math.PI * 2
      const power = 100 + Math.floor(Math.random() * 50)
      const dir = { x: Math.cos(angle) * power, y: Math.sin(angle) * power }
      game.computerMovePower = power
      game.computerMoveAngle = angle

      const cueBall = game.computerWorld.dynamicBodies.find(
        (b) => b.id === game.cueBallId
      )
      if (cueBall) {
        physics.applyVelocity(cueBall, {
          x: dir.x * POWER_SCALE,
          y: dir.y * POWER_SCALE,
        })
      }
    }

    for (
      let i = game.computerStep;
      i < game.computerStep + COMPUTER_FRAMES_PER_LOGIC_FRAME;
      i++
    ) {
      const collisions = physics.worldStep(60, game.computerWorld)
      collisions.push(...physics.worldStep(60, game.computerWorld))

      // fake the table resistance
      applyFriction(game.computerWorld)

      if (!game.computerFirstHitBall) {
        const remaining = game.computerWorld.dynamicBodies.filter(
          (b) => b.data === game.playerCols[COMPUTER_ID]
        ).length

        for (const col of collisions) {
          if (col.bodyAId === game.cueBallId) {
            const otherBall = game.computerWorld.dynamicBodies.find(
              (b) => b.id === col.bodyBId
            )
            if (otherBall) {
              // white hit another ball
              game.computerFirstHitBall = otherBall.data
              if (!game.computerMoveColor && otherBall.data !== BLACK) {
                game.computerMoveColor = otherBall.data
              }
            }
          }
          if (col.bodyBId === game.cueBallId) {
            const otherBall = game.computerWorld.dynamicBodies.find(
              (b) => b.id === col.bodyAId
            )
            if (otherBall) {
              // white hit another ball
              game.computerFirstHitBall = otherBall.data
              if (!game.computerMoveColor && otherBall.data !== BLACK) {
                game.computerMoveColor = otherBall.data
              }
            }
          }
        }

        if (
          game.computerFirstHitBall &&
          game.computerFirstHitBall !== game.computerMoveColor
        ) {
          if (remaining === 0 && game.computerFirstHitBall === BLACK) {
            game.computerMoveResult = "HIT OURS"
            game.computerMoveRating = 1
          } else {
            // hit the wrong ball first, this is a bad move - step
            // to the end and skip out
            game.computerMoveResult = "HIT WRONG BALL"
            game.computerStep = COMPUTER_SIM_TIME_FRAMES
            game.computerMoveRating = 0
          }
          break
        } else if (game.computerFirstHitBall) {
          // hit ours, reasonable move
          game.computerMoveResult = "HIT OURS"
          game.computerMoveRating = 1
        }
      }
      if (game.computerStep >= COMPUTER_SIM_TIME_FRAMES) {
        break
      }
      const pockets = game.computerWorld.staticBodies.filter(
        (s) => s.shapes[0].sensor
      )
      for (const pocket of pockets) {
        const shape = pocket.shapes[0]
        if (shape.sensorColliding) {
          for (const collision of shape.sensorCollisions) {
            const ball = game.computerWorld.dynamicBodies.find(
              (b) => b.shapes[0].id === collision
            )
            if (ball) {
              // potted a ball
              if (ball.data === WHITE) {
                game.computerMoveResult = "POTTED WHITE"
                // potted the white, not a good move
                game.computerStep = COMPUTER_SIM_TIME_FRAMES
                game.computerMoveRating = 0
                break
              } else if (
                game.computerMoveColor &&
                ball.data === game.computerMoveColor
              ) {
                // potter one of ours, good move in theory
                game.computerMoveResult = "POTTED OURS"
                game.computerMoveRating = 2
              } else if (ball.data === BLACK) {
                // if we still have balls on the table this is bad
                if (
                  game.computerWorld.dynamicBodies.find(
                    (b) => b.data == game.computerMoveColor
                  ) ||
                  !game.computerMoveColor
                ) {
                  game.computerMoveResult = "POTTED BLACK BAD"
                  game.computerStep = COMPUTER_SIM_TIME_FRAMES
                  game.computerMoveRating = 0
                  break
                } else {
                  // otherwise its the winning move
                  game.computerMoveResult = "POTTED BLACK GOOD"
                  game.computerMoveRating = 3
                }
              } else if (
                game.computerMoveColor &&
                ball.data !== game.computerMoveColor
              ) {
                // potted one of theirs, bad move
                game.computerMoveResult = "POTTED THEIRS"
                game.computerStep = COMPUTER_SIM_TIME_FRAMES
                game.computerMoveRating = 0
                break
              }
            }
          }
          if (game.computerStep >= COMPUTER_SIM_TIME_FRAMES) {
            break
          }
        }
        if (game.computerStep >= COMPUTER_SIM_TIME_FRAMES) {
          break
        }
      }

      if (physics.atRest(game.computerWorld)) {
        game.computerStep = COMPUTER_SIM_TIME_FRAMES
      }
    }

    game.computerStep += COMPUTER_FRAMES_PER_LOGIC_FRAME
  }

  if (game.computerStep >= COMPUTER_SIM_TIME_FRAMES) {
    if (!game.computerFirstHitBall) {
      game.computerMoveResult = "DIDN'T HIT ANYTHING"
      game.computerStep = COMPUTER_SIM_TIME_FRAMES
      game.computerMoveRating = 0
    }
    if (game.computerMoveRating > game.computerBestRating) {
      game.computerBestRating = game.computerMoveRating
      game.computerBestPower = game.computerMovePower
      game.computerBestAngle = game.computerMoveAngle
      game.computerBestResult = game.computerMoveResult
    }
    game.computerIndex += COMPUTER_ANGLE_STEP
    game.computerStep = 0
  }
}

function applyFriction(world: physics.World) {
  const friction = 0.97
  const minVelocity = 1
  for (const body of world.dynamicBodies) {
    body.velocity.x *= friction
    body.velocity.y *= friction
    if (Math.abs(body.velocity.x) < minVelocity) {
      body.velocity.x = 0
    }
    if (Math.abs(body.velocity.y) < minVelocity) {
      body.velocity.y = 0
    }

    if (body.velocity.x === 0 && body.velocity.y === 0) {
      body.restingTime = 1
    }
  }
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
      computerStep: 0,
      computerWorld: physics.createWorld(),
      computerMoveRating: 0,
      computerBestAngle: 0,
      computerBestRating: 0,
      computerBestPower: 0,
      computerMoveAngle: 0,
      computerMovePower: 0,
      computerTakeShotAt: 0,
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
        if (game.computerTakeShotAt === 0) {
          runComputerTurn(game)
        } else if (Rune.gameTime() > game.computerTakeShotAt) {
          takeComputerShot(game)
          game.computerTakeShotAt = 0
        }
      }
      return
    }

    const collisions = physics.worldStep(60, game.world)
    collisions.push(...physics.worldStep(60, game.world))

    // fake the table resistence
    applyFriction(game.world)

    // look for ball collisions
    if (!game.firstHitBall) {
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

            const otherPlayers = allPlayerIds.filter(
              (i) => i !== game.whoseTurn
            )
            const otherPlayer =
              otherPlayers.length > 0 ? otherPlayers[0] : COMPUTER_ID

            if (
              !game.playerCols[game.whoseTurn] &&
              [RED, YELLOW].includes(ball.data)
            ) {
              game.playerCols[game.whoseTurn] = ball.data
              game.playerCols[otherPlayer] = ball.data === RED ? YELLOW : RED
              game.shotsRemaining = 1
            }
          }
        }
      }
    }

    if (physics.atRest(game.world) && game.shot) {
      game.shotsRemaining--

      // evaluate the game now the world has come to rest
      const startingCol = game.playerCols[game.whoseTurn]
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
        } else if (game.firstHitBall !== startingCol && startingCol) {
          const remainingBalls = game.world.dynamicBodies.filter(
            (b) => b.data === startingCol
          ).length
          if (game.firstHitBall === BLACK && remainingBalls === 0) {
            // hit the black when we have none left is not a foul
          } else {
            // hit the wrong ball, foul
            game.whoseTurn = otherPlayer
            game.shotsRemaining = 2
            game.events.push({ id: game.nextEventId++, type: "foul", data: "" })
          }
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
        game.computerBestAngle = 0
        game.computerBestRating = 0
        game.computerBestPower = 0
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
