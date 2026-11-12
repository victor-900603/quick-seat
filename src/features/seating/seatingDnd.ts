import {
  pointerWithin,
  type ClientRect,
  type Collision,
  type CollisionDetection,
  type Modifier,
} from '@dnd-kit/core'

export const SEAT_DROP_TOLERANCE = 12
export const MAX_DRAG_SEATS = 900

export function isSeatDragEnabled(seatCount: number): boolean {
  return seatCount <= MAX_DRAG_SEATS
}
export const DRAG_PREVIEW_OFFSET = 14

interface Point {
  x: number
  y: number
}

function eventPoint(event: Event): Point | null {
  const mouseEvent = event as MouseEvent

  if (
    typeof mouseEvent.clientX === 'number' &&
    typeof mouseEvent.clientY === 'number'
  ) {
    return { x: mouseEvent.clientX, y: mouseEvent.clientY }
  }

  const touchEvent = event as TouchEvent
  const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0]

  return touch ? { x: touch.clientX, y: touch.clientY } : null
}

/** 讓拖曳預覽跟著游標右下方移動，避免遮住落點座位。 */
export const cursorOffsetModifier: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!activatorEvent || !draggingNodeRect) {
    return transform
  }

  const point = eventPoint(activatorEvent)

  if (!point) {
    return transform
  }

  return {
    ...transform,
    x:
      transform.x +
      point.x -
      draggingNodeRect.left +
      DRAG_PREVIEW_OFFSET,
    y:
      transform.y +
      point.y -
      draggingNodeRect.top +
      DRAG_PREVIEW_OFFSET,
  }
}

function distanceToRect(point: Point, rect: ClientRect): number {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right)
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom)

  return Math.hypot(dx, dy)
}

/**
 * 以游標位置判定落點，避免拖曳大型卡片時，
 * 因卡片中心與游標有偏移而落到隔壁座位。
 * 游標落在座位間隙時，允許在容差內吸附到最近座位。
 */
export const seatCollisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)

  if (hits.length > 0) {
    return hits
  }

  if (!args.pointerCoordinates) {
    return []
  }

  let nearest: {
    id: Collision['id']
    container: (typeof args.droppableContainers)[number]
    distance: number
  } | null = null

  for (const container of args.droppableContainers) {
    if (container.disabled) {
      continue
    }

    const rect = args.droppableRects.get(container.id)

    if (!rect) {
      continue
    }

    const distance = distanceToRect(args.pointerCoordinates, rect)

    if (distance <= SEAT_DROP_TOLERANCE && (!nearest || distance < nearest.distance)) {
      nearest = { id: container.id, container, distance }
    }
  }

  if (!nearest) {
    return []
  }

  return [
    {
      id: nearest.id,
      data: {
        droppableContainer: nearest.container,
        value: nearest.distance,
      },
    },
  ]
}
