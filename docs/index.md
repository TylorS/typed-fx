---
title: Home
nav_order: 1
---

A `Fx` is a push-based reactive data structure that declaratively represents multi-shot Effects.
An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.

With an Fx you can represent workflows that exist over time like RPC, DOM Event, and so much more.
You can skip, take, filter, and transform the events of an Fx. You can also easily create your own
if you don't find one of the many operators provided to work in your situation.
