---
title: Microtask
category: api, performance
bugzilla: 1480236
firefox_status: 69
mdn_url: https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/queueMicrotask
spec_url: https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#microtask-queuing
spec_repo: https://github.com/whatwg/html
chrome_ref: 5111086432911360
webkit_status: shipped
---

Adds a new method, queueMicrotask(), which allows direct queueing of a callback to run as a microtask. Microtasks are callbacks that run just before the current task ends.
