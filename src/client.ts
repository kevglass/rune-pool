import { physics } from "propel-js"
import "./styles.css"
import {
  BALL_SIZE,
  COMPUTER_ID,
  GameState,
  MIN_POWER,
  POWER_SCALE,
  RED,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  WHITE,
  YELLOW,
} from "./logic"
import { getAssetUrl } from "./assets"
import { PlayerId } from "rune-sdk"
import { tr } from "./translate"

const RACK: HTMLAudioElement = new Audio(getAssetUrl("sounds/rack.mp3"))
const CUE: HTMLAudioElement = new Audio(getAssetUrl("sounds/cue.mp3"))
const CUSHION: HTMLAudioElement[] = []
for (let i = 1; i < 11; i++) {
  CUSHION.push(new Audio(getAssetUrl("sounds/cushion" + i + ".mp3")))
}
const HITS: HTMLAudioElement[] = []
for (let i = 1; i < 14; i++) {
  HITS.push(new Audio(getAssetUrl("sounds/hit" + i + ".mp3")))
}
const POTS: HTMLAudioElement[] = []
for (let i = 1; i < 14; i++) {
  POTS.push(new Audio(getAssetUrl("sounds/pot.mp3")))
}
let nextCushion = 0
let nextHit = 0
let nextPot = 0
let markerAngle = 0

const COLS: Record<number, string> = {
  1: "#e2e50e",
  2: "#141895",
  3: "#db1b18",
  4: "#800a7a",
  5: "#e85007",
  6: "#2ba610",
  7: "#990f0d",
  8: "black",
  9: "#e2e50e",
  10: "#141895",
  11: "#db1b18",
  12: "#800a7a",
  13: "#e85007",
  14: "#2ba610",
  15: "#990f0d",
}

let spotsAndStripes = true
let table = "blue"
let difficulty = "normal"

const canvas = document.createElement("canvas")
canvas.width = window.innerWidth
canvas.height = window.innerHeight
const usedSpace = 0.85
const scale = Math.min(
  (window.innerWidth * usedSpace) / TABLE_WIDTH,
  (window.innerHeight * usedSpace) / TABLE_HEIGHT
)
const offsetX = (window.innerWidth - TABLE_WIDTH * scale) / 2
const offsetY = (window.innerHeight - TABLE_HEIGHT * scale) / 2
document.body.appendChild(canvas)

let shownTip = false
let localPlayerId: PlayerId | undefined
let whoseTurn: string
let lastEventProcessed: number = 0
let atRest: boolean = false

type RackBall = {
  y: number
  col: string
  target: number
  num: number
}

let rack: RackBall[] = []
let lastCol = ""

div("settingsButton").addEventListener("click", () => {
  select("difficultySelect").value = difficulty
  select("tableSelect").value = table
  select("ballsSelect").value = spotsAndStripes
    ? "spotsAndStripes"
    : "redAndYellow"
  div("settings").style.display = "block"
})

div("closeButton").addEventListener("click", () => {
  div("settings").style.display = "none"
})

select("difficultySelect").addEventListener("change", () => {
  const difficulty = select("difficultySelect").value
  Rune.actions.setDifficulty(difficulty)
})
select("tableSelect").addEventListener("change", () => {
  table = select("tableSelect").value
  Rune.actions.setTable(table)
})

select("ballsSelect").addEventListener("change", () => {
  spotsAndStripes = select("ballsSelect").value === "spotsAndStripes"
  Rune.actions.setBalls(spotsAndStripes)
})

function addRackBall(col: string, num: number) {
  rack.push({
    col,
    y: TABLE_HEIGHT * 0.86,
    target: TABLE_HEIGHT * 0.21 + rack.length * BALL_SIZE * 2,
    num,
  })
}

div("turn").style.display = "none"

const ctx = canvas.getContext("2d")!

let mouseDown = false
let startX = 0
let startY = 0
let dx = 0
let dy = 0
let messageToShow: string = ""

function select(id: string): HTMLSelectElement {
  return document.getElementById(id) as HTMLSelectElement
}

function div(id: string): HTMLDivElement {
  return document.getElementById(id) as HTMLDivElement
}

function img(id: string): HTMLImageElement {
  return document.getElementById(id) as HTMLImageElement
}

const touchDevice = "ontouchstart" in document.documentElement
if (touchDevice) {
  canvas.addEventListener("touchstart", (e) => {
    startDrag(e.touches[0].clientX, e.touches[0].clientY)
  })
  canvas.addEventListener("touchend", (e) => {
    endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
  })
  canvas.addEventListener("touchmove", (e) => {
    if (mouseDown) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  })
  document.addEventListener("touchcancel", () => {
    endDrag(startX, startY)
  })
} else {
  canvas.addEventListener("mousedown", (e) => {
    startDrag(e.clientX, e.clientY)
  })
  canvas.addEventListener("mouseup", (e) => {
    endDrag(e.clientX, e.clientY)
  })
  canvas.addEventListener("mousemove", (e) => {
    if (mouseDown) {
      moveDrag(e.clientX, e.clientY)
    }
  })
}

function startDrag(x: number, y: number) {
  if (whoseTurn !== localPlayerId || !atRest) {
    return
  }
  mouseDown = true
  startX = x
  startY = y
  div("message").style.display = "none"
  div("help").style.display = "none"
  messageToShow = ""
}

function moveDrag(x: number, y: number) {
  if (whoseTurn !== localPlayerId || !atRest) {
    return
  }
  dx = x - startX
  dy = y - startY
}

function endDrag(x: number, y: number) {
  if (whoseTurn !== localPlayerId || !atRest) {
    return
  }
  mouseDown = false
  dx = x - startX
  dy = y - startY
  dx /= scale
  dy /= scale
  const power = Math.sqrt(dx * dx + dy * dy)
  if (power > MIN_POWER / POWER_SCALE) {
    Rune.actions.shot({ x: -dx, y: -dy })
  }
}

let floorImage: HTMLImageElement
let tableImages: Record<string, HTMLImageElement>

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image()
    image.src = url
    image.addEventListener("load", () => {
      resolve(image)
    })
  })
}

function drawBall(
  data: { col: string; num: number },
  x: number,
  y: number,
  radius: number,
  angle: number,
  ctx: CanvasRenderingContext2D
): void {
  ctx.save()

  if (spotsAndStripes && data.col !== WHITE) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.clip()

    const fullRotation = radius * 4
    const angX = ((x % fullRotation) / fullRotation) * Math.PI * 2
    const angY = ((y % fullRotation) / fullRotation) * Math.PI * 2
    ctx.save()
    const stripe = data.num > 8
    const stripeSize = radius
    ctx.fillStyle = stripe ? "white" : COLS[data.num]
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)

    const xpos = Math.sin(angX)
    const ypos = Math.sin(angY)

    const spaceSize = radius * 0.5
    const radiusScale = 2.5
    const edgeScale = 1.8

    if (stripe) {
      ctx.save()
      // ctx.fillStyle = COLS[data.num]
      // ctx.fillRect(-radius * 2, -stripeSize / 2, radius * 4, stripeSize)
      ctx.strokeStyle = COLS[data.num]
      ctx.lineWidth = stripeSize
      ctx.translate(x, y)
      ctx.rotate(angle / 360 + Math.PI * 2)
      if (angY > Math.PI * 0.5 && angY < Math.PI * 1.5) {
        ctx.beginPath()
        ctx.moveTo(-radius * edgeScale, 0)
        ctx.quadraticCurveTo(
          0,
          -ypos * radius * radiusScale,
          radius * edgeScale,
          0
        )
        ctx.stroke()
      }
      if (angY < Math.PI * 0.5 || angY > Math.PI * 1.5) {
        ctx.beginPath()
        ctx.moveTo(-radius * edgeScale, 0)
        ctx.quadraticCurveTo(
          0,
          ypos * radius * radiusScale,
          radius * edgeScale,
          0
        )
        ctx.stroke()
      }
      ctx.restore()
    }

    ctx.translate(x, y)
    ctx.rotate(angle / 360 + Math.PI * 2)

    if (angY > Math.PI / 2 && angY < Math.PI * 1.5) {
      ctx.translate(-xpos * radius, -ypos * radius)
    } else {
      ctx.translate(-xpos * radius, ypos * radius)
    }

    if (
      angY > Math.PI / 2 &&
      angY < Math.PI * 1.5 &&
      angX > Math.PI / 2 &&
      angX < Math.PI * 1.5
    ) {
      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(0, 0, spaceSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.textAlign = "center"
      ctx.font = "bold 3px Arial"
      ctx.fillStyle = "black"
      ctx.fillText("" + data.num, 0, 1)
    }

    ctx.restore()
  } else {
    ctx.fillStyle = data.col
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const shineWeight = spotsAndStripes ? 0.25 : data.col === YELLOW ? 1 : 0.5
  ctx.strokeStyle = "rgba(0,0,0,0.5)"
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = "rgba(255,255,255," + shineWeight + ")"
  ctx.beginPath()
  const xoffset = Math.floor(x) % 2
  const yoffset = Math.floor(y) % 2
  ctx.arc(
    x + xoffset / scale - radius / 4,
    y + yoffset / scale - radius / 4,
    radius / 4,
    0,
    Math.PI * 2
  )
  ctx.fill()

  ctx.restore()
}

function drawTable(game: GameState) {
  ctx.save()
  ctx.fillStyle = "black"
  ctx.scale(scale, scale)
  ctx.drawImage(floorImage, 0, 0, canvas.width / scale, canvas.height / scale)
  ctx.restore()
  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)
  const overdraw = 0.1
  ctx.drawImage(
    tableImages[table] ?? tableImages["green"],
    -TABLE_WIDTH * overdraw,
    -TABLE_HEIGHT * overdraw,
    TABLE_WIDTH * (1 + overdraw * 2),
    TABLE_HEIGHT * (1 + overdraw * 2)
  )

  const world = game.world
  for (const body of physics.allBodies(world)) {
    const shape = body.shapes[0]
    if (shape.type === physics.ShapeType.CIRCLE) {
      const offsetx =
        ((body.center.x - TABLE_WIDTH / 2) / (TABLE_WIDTH / 2)) * (4 / scale)
      const offsety =
        ((body.center.y - TABLE_HEIGHT / 2) / (TABLE_HEIGHT / 2)) * (4 / scale)
      ctx.fillStyle = "rgba(0,0,0,0.2)"
      ctx.beginPath()
      ctx.arc(
        body.center.x + offsetx * scale,
        body.center.y + offsety * scale,
        shape.bounds,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }
  for (const body of physics.allBodies(world)) {
    const shape = body.shapes[0]
    if (shape.type === physics.ShapeType.CIRCLE) {
      if (body.data) {
        drawBall(
          body.data,
          body.center.x,
          body.center.y,
          shape.bounds,
          body.angle,
          ctx
        )
      }
    }
  }
  for (const body of physics.allBodies(world)) {
    const shape = body.shapes[0]
    if (shape.type === physics.ShapeType.CIRCLE) {
      if (atRest && body.data && body.data.col === WHITE) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)"
        ctx.lineWidth = 1
        ctx.save()
        ctx.translate(body.center.x, body.center.y)
        ctx.rotate(markerAngle)
        ctx.setLineDash([2, 1])
        ctx.beginPath()
        ctx.arc(0, 0, shape.bounds * 1.2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
        markerAngle += 0.05
      }
    }
  }

  if (mouseDown && atRest) {
    const cueBall = physics
      .allBodies(world)
      .find((body) => body.data.col === "white")
    if (cueBall) {
      ctx.lineWidth = 5
      ctx.setLineDash([5, 1])
      ctx.strokeStyle = "rgba(255,255,255,0.2)"
      ctx.beginPath()
      ctx.moveTo(cueBall.center.x, cueBall.center.y)
      ctx.lineTo(cueBall.center.x - dx / scale, cueBall.center.y - dy / scale)
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.strokeStyle = "rgba(255,255,255,0.4)"
      ctx.beginPath()
      ctx.moveTo(cueBall.center.x, cueBall.center.y)
      ctx.lineTo(cueBall.center.x - dx / scale, cueBall.center.y - dy / scale)
      ctx.stroke()
    }
  }

  let lastBall
  for (const ball of rack) {
    if (lastBall && ball.y - lastBall.y < BALL_SIZE * 2) {
      break
    }
    if (ball.target < ball.y) {
      ball.y -= 1
    }

    drawBall(ball, TABLE_WIDTH * 1.069, ball.y, BALL_SIZE - 0.5, 0, ctx)
    ctx.fillStyle = "rgba(0,0,0,0.25)"
    ctx.beginPath()
    ctx.arc(TABLE_WIDTH * 1.069, ball.y, BALL_SIZE - 0.5, 0, Math.PI * 2)
    ctx.fill()
    lastBall = ball
  }
  ctx.restore()
}

function getAvatarUrl(id: string) {
  if (id === COMPUTER_ID) {
    return difficulty === "hard"
      ? getAssetUrl("robot-hard.png")
      : getAssetUrl("robot.png")
  }
  return Rune.getPlayerInfo(id).avatarUrl
}

function getDisplayNameTurn(id: string) {
  if (id === COMPUTER_ID) {
    return tr("Computer's Turn")
  }
  if (id === localPlayerId) {
    return tr("Your Turn")
  }
  return tr("Bob's Turn").replace("Bob", Rune.getPlayerInfo(id).displayName)
}

function applyTurnIndicator(col: string = lastCol) {
  lastCol = col

  if (spotsAndStripes) {
    div("turnColor").className = col === RED ? "stripes" : "spots"
    div("turnColor").innerHTML = col === RED ? tr("stripes") : tr("spots")
  } else {
    div("turnColor").className = col === RED ? "red" : "yellow"
    div("turnColor").innerHTML = col === RED ? tr("red") : tr("yellow")
  }
}

function updateUI(game: GameState) {
  if (physics.atRest(game.world)) {
    if (!shownTip && game.whoseTurn === localPlayerId) {
      shownTip = true
      showMessage("Touch and drag anywhere to shoot")
    }

    div("shotsLeft").innerHTML =
      game.shotsRemaining < 2 ? tr("1 shot") : tr("2 shots")
    div("turn").className = "turnOn"
    div("turn").style.display = "block"
    div("whoseTurn").innerHTML = getDisplayNameTurn(game.whoseTurn)
    div("turn").style.background =
      game.whoseTurn === localPlayerId
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.4)"
    img("whoseTurnAvatar").src = getAvatarUrl(game.whoseTurn)
    div("")
    const col = game.playerCols[game.whoseTurn]
    if (!col) {
      div("turnColor").style.display = "none"
    } else {
      applyTurnIndicator(col)
      div("turnColor").style.display = "block"
    }

    if (game.whoseTurn === COMPUTER_ID) {
      div("thinkBar").style.display = "block"
      div("thinkComplete").style.width = (game.computerIndex / 360) * 100 + "%"
    } else {
      div("thinkBar").style.display = "none"
    }
  } else {
    div("turn").className = "turnOff"
    div("message").style.display = "none"
  }
}

function showMessage(message: string) {
  if (message.length > 0) {
    div("message").innerHTML = message
    div("message").style.display = "block"
  } else {
    div("message").style.display = "none"
    div("help").style.display = "none"
  }
}

;(async () => {
  tableImages = {
    green: await loadImage(getAssetUrl("table.png")),
    blue: await loadImage(getAssetUrl("table-blue.png")),
    red: await loadImage(getAssetUrl("table-red.png")),
  }
  floorImage = await loadImage(getAssetUrl("floor.png"))
  Rune.initClient({
    onChange: ({ game, yourPlayerId, action }) => {
      if (action && action.name === "shot") {
        messageToShow = ""
      }

      if (table !== game.table) {
        table = game.table
      }
      if (difficulty !== game.difficulty) {
        difficulty = game.difficulty
      }
      if (spotsAndStripes !== game.spotsAndStripes) {
        spotsAndStripes = game.spotsAndStripes
        applyTurnIndicator()
      }
      // reinit everything
      if (game.startGame) {
        RACK.play()
        lastEventProcessed = 0
        shownTip = false
        localPlayerId = undefined
        rack = []
        if (yourPlayerId === game.whoseTurn) {
          messageToShow = tr("Touch and drag anywhere to shoot")
        }
      }

      localPlayerId = yourPlayerId
      whoseTurn = game.whoseTurn
      drawTable(game)
      updateUI(game)

      const nowAtRest = physics.atRest(game.world)
      if (!nowAtRest && atRest) {
        // things just started moving
        messageToShow = ""
        showMessage("")
      }
      atRest = nowAtRest

      for (const event of game.events) {
        if (event.id > lastEventProcessed) {
          lastEventProcessed = event.id

          // new event
          if (event.type === "shot") {
            CUE.play()
          }
          if (event.type === "ballHit") {
            HITS[nextHit].play()
            nextHit = (nextHit + 1) % HITS.length
          }
          if (event.type === "cushionHit") {
            CUSHION[nextCushion].play()
            nextCushion = (nextCushion + 1) % CUSHION.length
          }
          if (event.type === "foul") {
            messageToShow = tr("Foul! 2 Shots!")
          }
          if (event.type === "potted") {
            POTS[nextPot].play()
            nextPot = (nextPot + 1) % POTS.length
            if (event.data !== WHITE) {
              setTimeout(() => {
                addRackBall(event.data, event.num!)
              }, 500)
            }
          }
        }
      }

      if (atRest) {
        showMessage(messageToShow)
      }
    },
  })
})()
