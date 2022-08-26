import { Id } from './Id.js'

/**
 * Sometimes it is necessary to tag a Service to ensure it is considered different from another at the type-level.
 */
export const tagged = <Tag extends string>(tag: Tag) =>
  class TaggedService extends Id {
    static tag: Tag = tag
    readonly tag: Tag = tag
  }
