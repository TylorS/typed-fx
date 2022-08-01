import { Disposable } from '@/Disposable/Disposable.js'
import { MAX_UNIX_TIME, UnixTime } from '@/Time/index.js'

export interface Timeline<A> {
  readonly nextArrival: () => UnixTime
  readonly isEmpty: () => boolean
  readonly add: (time: UnixTime, a: A) => Disposable
  readonly remove: (time: UnixTime, a: A) => boolean
  readonly getReadyTasks: (t: UnixTime) => readonly A[]
  readonly addListener: (listener: () => void) => Disposable
}

/**
 * A Timeline is a time-ordered queue, which uses a binary search to quickly insert new values and removals.
 * getReadyTasks allows you to extract all of the values held in the queue that is at or before the specified Time.
 */
export class Timeline<A> implements Timeline<A> {
  readonly listeners = new Set<() => void>()

  constructor(readonly onUpdated?: () => void, readonly timeSlots: Array<TimeSlot<A>> = []) {
    this.timeSlots = []
  }

  readonly addListener = (listener: () => void): Disposable => {
    this.listeners.add(listener)

    return Disposable(() => this.listeners.delete(listener))
  }

  readonly nextArrival = (): UnixTime => {
    if (this.isEmpty()) {
      return MAX_UNIX_TIME
    }

    return this.timeSlots[0].time
  }

  readonly isEmpty = (): boolean => {
    return this.timeSlots.length === 0
  }

  readonly add = (time: UnixTime, a: A): Disposable => {
    insertByTime(time, a, this.timeSlots)
    this.onUpdated?.()

    return Disposable(() => this.remove(time, a))
  }

  readonly remove = (time: UnixTime, a: A): boolean => {
    const i = binarySearch(time, this.timeSlots)

    if (i >= 0 && i < this.timeSlots.length) {
      const events = this.timeSlots[i].events
      const at = events.findIndex((x) => x === a)

      if (at >= 0) {
        events.splice(at, 1)

        if (events.length === 0) {
          this.timeSlots.splice(i, 1)
        }

        this.onUpdated?.()

        return true
      }
    }

    return false
  }

  readonly getReadyTasks = (t: UnixTime): readonly A[] => {
    const tasks = this.timeSlots
    const l = tasks.length
    let i = 0

    while (i < l && tasks[i].time <= t) {
      ++i
    }

    return this.timeSlots.splice(0, i).flatMap((x) => x.events)
  }
}

interface TimeSlot<A> {
  readonly time: UnixTime
  readonly events: A[]
}

function insertByTime<A>(time: UnixTime, a: A, timeslots: Array<TimeSlot<A>>): void {
  const l = timeslots.length

  if (l === 0) {
    timeslots.push(makeTimeslot(time, [a]))

    return
  }

  const i = binarySearch(time, timeslots)

  if (i >= l) {
    timeslots.push(makeTimeslot(time, [a]))
  } else {
    insertAtTimeslot(a, timeslots, time, i)
  }
}

function insertAtTimeslot<A>(
  task: A,
  timeslots: Array<TimeSlot<A>>,
  time: UnixTime,
  i: number,
): void {
  const timeslot = timeslots[i]

  if (time === timeslot.time) {
    timeslot.events.push(task)
  } else {
    timeslots.splice(i, 0, makeTimeslot(time, [task]))
  }
}

function binarySearch<A>(t: UnixTime, sortedArray: ArrayLike<TimeSlot<A>>): number {
  let lo = 0
  let hi = sortedArray.length
  let mid, y

  while (lo < hi) {
    mid = Math.floor((lo + hi) / 2)
    y = sortedArray[mid]

    if (t === y.time) {
      return mid
    } else if (t < y.time) {
      hi = mid
    } else {
      lo = mid + 1
    }
  }

  return hi
}

const makeTimeslot = <A>(t: UnixTime, events: A[]): TimeSlot<A> => ({
  time: t,
  events: events,
})
