---
title: Why I Still Read the Code
date: 2026-10-08
description: Software engineering is shifting toward reviewing LLM output and high-level decisions. Here is why reading the code remains essential.
---

Recently (in the last 10 months, or so it feels to many of us) the job of the software engineer has changed a lot.

It happened to me as well: I'm not writing code by hand anymore.

Many conversations around this shift land on the point that software engineering is now basically about making design decisions, reviewing the output of an LLM, and ensuring that what gets published to production can really be a long-term bet.

I agree with much of that direction. But there's a growing idea floating around that we shouldn't even read the code anymore.

Think about engineers designing microwave ovens. They are not building them by hand; machines do that. But those engineers still know exactly how the final product is made inside. They have to: when the production line starts pushing out malfunctioning units, or when a product breaks in the field, they are the ones who need to step in. Revisions are needed, improvements are expected, and without knowing how the product is actually made, that becomes impossible.

Delegating code generation to an LLM doesn't change this reality. I don't buy the idea that we can stop reading code.

"But nobody reads the assembly a compiler produces." True, and the reason is determinism. With a compiler, the mapping from source to output is deterministic and specified: you know what's inside because the process guarantees it. With an LLM, the step from plan to code is not deterministic. The same plan can produce different code, and nothing guarantees that what comes out is what you meant. The only way to know what's inside is to open it.

Yes, this means more reading than before, and that is the cost of the job now. Here is why I think it's worth paying.

## 1. System knowledge lives in the code

Reading the code, and actually understanding it, is how we gain and retain the knowledge we need to know the system well.

Without that deep understanding, you can't credibly advocate for some architectural decisions instead of others. High-level diagrams and documentation only tell you how things were intended to work; the code shows how they actually behave under real conditions.

If you stop reading the code, you lose intimacy with the system. And when you lose intimacy with the system, your architectural decisions are just guesses based on summaries.

## 2. The devil is in the details

A high-level description of what the LLM just produced, or of what it is going to produce when you review the plan before letting it write code, isn't enough to be sure that all requirements were met and that no regressions happened.

Summaries always sound reasonable. But they don't capture the subtle things: an unhandled edge case, an implicit contract broken, or a state mutation that has unintended side effects three layers down.

To know that the change is safe, you have to read the diff.

## Legacy reality vs. greenfield

So reading code is something that I still do, and will keep doing in the long run if I want to keep delivering code that meets my own quality bar.

This is especially true for legacy code with 10+ years of commit history and for platforms full of integrations with third-party services. In those environments, odd lines of code usually exist because of hard-learned production lessons. An LLM reviewing itself or generating a high-level summary simply won't have the context for every historical scar.

For new projects, it might be different, and I am experimenting with it. But for mature production systems, skipping the code is a gamble.

<div class="video-container">
  <iframe
    src="https://www.youtube-nocookie.com/embed/3TNpOD6bov8"
    title="LGTM (Looks Good to Me) - Claude Opus 5.5 music video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen>
  </iframe>
</div>

~$ _
