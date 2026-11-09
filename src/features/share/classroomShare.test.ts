import { compressToEncodedURIComponent } from 'lz-string'
import { describe, expect, it } from 'vitest'
import type { Classroom } from '../../types/domain'
import { createClassroom } from '../classroom/classroomOps'
import {
  MAX_CLASSROOM_SHARE_URL_LENGTH,
  createClassroomShareUrl,
  decodeClassroomShare,
  getClassroomShareStats,
  isClassroomShareUrlTooLong,
  readClassroomShareHash,
  serializeClassroomShare,
  serializeClassroomShareJson,
  toSharedClassroom,
} from './classroomShare'

function sharedClassroom(): Classroom {
  const classroom = createClassroom({
    cols: 3,
    rows: 2,
    numbering: {
      pattern: '{row}-{col}',
      order: 'snake',
      startAt: 5,
      pad: 1,
    },
  })

  classroom.cells[1] = { type: 'aisle' }
  classroom.cells[2] = { type: 'blocked' }
  classroom.cells[4] = { type: 'empty' }
  classroom.codeOverrides = {
    r0c0: 'A1',
    r1c2: 'C2',
  }

  return classroom
}

function encode(value: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(value))
}

describe('classroom share', () => {
  it('將教室轉為精簡分享資料', () => {
    const classroom = sharedClassroom()
    const shared = toSharedClassroom(classroom)

    expect(shared).toEqual({
      version: 1,
      cols: 3,
      rows: 2,
      cells: 'sabses',
      numbering: {
        pattern: '{row}-{col}',
        order: 'snake',
        startAt: 5,
        pad: 1,
      },
      codeOverrides: { r0c0: 'A1', r1c2: 'C2' },
    })
  })

  it('序列化後可還原四種格子、編號與自訂座號', () => {
    const classroom = sharedClassroom()
    const result = decodeClassroomShare(serializeClassroomShare(classroom))

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      return
    }

    expect(result.classroom.id).not.toBe(classroom.id)
    expect(result.classroom.name).toBe('分享的教室')
    expect(result.classroom.cols).toBe(3)
    expect(result.classroom.rows).toBe(2)
    expect(result.classroom.cells).toEqual(classroom.cells)
    expect(result.classroom.numbering).toEqual(classroom.numbering)
    expect(result.classroom.codeOverrides).toEqual(classroom.codeOverrides)
  })

  it('可建立分享網址並從 hash 還原', () => {
    const classroom = sharedClassroom()
    const url = createClassroomShareUrl(
      classroom,
      'https://example.com/quick-seat/#old',
    )
    const hash = new URL(url).hash
    const result = readClassroomShareHash(hash)

    expect(url.startsWith('https://example.com/quick-seat/#classroom=')).toBe(
      true,
    )
    expect(result?.status).toBe('ready')
  })

  it('非分享 hash 回傳 null', () => {
    expect(readClassroomShareHash('')).toBeNull()
    expect(readClassroomShareHash('#section')).toBeNull()
    expect(readClassroomShareHash('#classroom')).toBeNull()
  })

  it('損壞的壓縮資料回傳錯誤', () => {
    expect(readClassroomShareHash('#classroom=not-valid')).toMatchObject({
      status: 'error',
    })
    expect(decodeClassroomShare('')).toMatchObject({ status: 'error' })
  })

  it('拒絕不支援的版本與錯誤尺寸', () => {
    const base = toSharedClassroom(sharedClassroom())

    expect(
      decodeClassroomShare(encode({ ...base, version: 2 })),
    ).toMatchObject({ status: 'error', message: '不支援的分享連結版本。' })
    expect(
      decodeClassroomShare(encode({ ...base, cols: 0, cells: '' })),
    ).toMatchObject({ status: 'error' })
    expect(
      decodeClassroomShare(encode({ ...base, cells: 's' })),
    ).toMatchObject({
      status: 'error',
      message: '教室格子數量與尺寸不一致。',
    })
    expect(
      decodeClassroomShare(encode({ ...base, cells: 's'.repeat(5) })),
    ).toMatchObject({ status: 'error' })
  })

  it('拒絕不合法的格子代碼與自訂座號', () => {
    const base = toSharedClassroom(sharedClassroom())

    expect(
      decodeClassroomShare(encode({ ...base, cells: 'sxbses' })),
    ).toMatchObject({
      status: 'error',
      message: '教室格子包含不支援的型別。',
    })
    expect(
      decodeClassroomShare(
        encode({ ...base, codeOverrides: { r9c9: 'A1' } }),
      ),
    ).toMatchObject({
      status: 'error',
      message: '自訂座位編號超出教室範圍：r9c9。',
    })
    expect(
      decodeClassroomShare(
        encode({ ...base, codeOverrides: { r0c1: 'A1' } }),
      ),
    ).toMatchObject({
      status: 'error',
      message: '自訂座位編號只能套用到座位：r0c1。',
    })
    expect(
      decodeClassroomShare(
        encode({ ...base, codeOverrides: { r0c0: '  ' } }),
      ),
    ).toMatchObject({
      status: 'error',
      message: '自訂座位編號不可空白：r0c0。',
    })
  })

  it('連結過長時可判斷', () => {
    expect(
      isClassroomShareUrlTooLong(
        `https://example.com/#${'a'.repeat(MAX_CLASSROOM_SHARE_URL_LENGTH)}`,
      ),
    ).toBe(true)
    expect(isClassroomShareUrlTooLong('https://example.com/#classroom=abc')).toBe(
      false,
    )
  })

  it('統計四種格子並輸出 JSON', () => {
    const classroom = sharedClassroom()

    expect(getClassroomShareStats(classroom)).toEqual({
      seats: 3,
      aisles: 1,
      blocked: 1,
      empty: 1,
    })
    expect(JSON.parse(serializeClassroomShareJson(classroom))).toEqual(
      toSharedClassroom(classroom),
    )
  })
})
