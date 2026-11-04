import type { CollisionDetection, Modifier } from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'
import {
  cursorOffsetModifier,
  DRAG_PREVIEW_OFFSET,
  SEAT_DROP_TOLERANCE,
  seatCollisionDetection,
} from './seatingDnd'

type CollisionArgs = Parameters<CollisionDetection>[0]

function rect(left: number, top: number, size = 50) {
  return {
    left,
    top,
    right: left + size,
    bottom: top + size,
    width: size,
    height: size,
  }
}

function container(id: string, disabled = false) {
  return {
    id,
    key: id,
    data: { current: {} },
    disabled,
    node: { current: null },
    rect: { current: null },
  } as unknown as CollisionArgs['droppableContainers'][number]
}

function createArgs(
  pointerCoordinates: CollisionArgs['pointerCoordinates'],
  containers: CollisionArgs['droppableContainers'],
  rects: Array<
    [
      CollisionArgs['droppableContainers'][number]['id'],
      ReturnType<typeof rect>,
    ]
  >,
): CollisionArgs {
  return {
    active: {
      id: 'active',
      data: { current: {} },
      rect: { current: { initial: null, translated: null } },
    },
    collisionRect: rect(300, 300),
    droppableContainers: containers,
    droppableRects: new Map(rects),
    pointerCoordinates,
  }
}

describe('seatCollisionDetection', () => {
  it('以游標所在座位為落點，不受拖曳卡片中心偏移影響', () => {
    const first = container('drop-seat-r0c0')
    const far = container('drop-seat-r0c4')
    const result = seatCollisionDetection(
      createArgs({ x: 25, y: 25 }, [first, far], [
        [first.id, rect(0, 0)],
        [far.id, rect(240, 0)],
      ]),
    )

    expect(result.map((collision) => collision.id)).toEqual([first.id])
  })

  it('游標落在座位間隙時吸附到容差內的最近座位', () => {
    const first = container('drop-seat-r0c0')
    const second = container('drop-seat-r0c1')
    const result = seatCollisionDetection(
      createArgs({ x: 58, y: 25 }, [first, second], [
        [first.id, rect(0, 0)],
        [second.id, rect(62, 0)],
      ]),
    )

    expect(result.map((collision) => collision.id)).toEqual([second.id])
  })

  it('游標超出容差時不判定落點', () => {
    const first = container('drop-seat-r0c0')
    const result = seatCollisionDetection(
      createArgs({ x: 200, y: 200 }, [first], [[first.id, rect(0, 0)]]),
    )

    expect(result).toEqual([])
  })

  it('沒有游標座標時不判定落點', () => {
    const first = container('drop-seat-r0c0')
    const result = seatCollisionDetection(
      createArgs(null, [first], [[first.id, rect(0, 0)]]),
    )

    expect(result).toEqual([])
  })

  it('容差為正數且大於座位間距', () => {
    expect(SEAT_DROP_TOLERANCE).toBeGreaterThan(5)
  })

  it('拖曳預覽維持在游標右下方，不遮住落點', () => {
    const result = cursorOffsetModifier({
      activatorEvent: new MouseEvent('pointerdown', {
        clientX: 100,
        clientY: 120,
      }),
      draggingNodeRect: {
        ...rect(40, 60),
        width: 100,
        height: 30,
      },
      transform: { x: 30, y: 20, scaleX: 1, scaleY: 1 },
    } as unknown as Parameters<Modifier>[0])

    expect(result.x).toBe(30 + 100 - 40 + DRAG_PREVIEW_OFFSET)
    expect(result.y).toBe(20 + 120 - 60 + DRAG_PREVIEW_OFFSET)
  })
})
