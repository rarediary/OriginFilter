# Reddit beta announcement — ready to post, NOT yet posted

**Use only in communities where developers can share free betas. Read the current community rules.** Suggested: r/alphaandbetausers first, or r/SideProject when permitted. Do not carpet-bomb subreddits or claim the app was approved by stores.

## Title

I made a free PC extension that reduces unwanted non-English posts on X, Facebook and YouTube — looking for beta testers

## Body

I got tired of social feeds where I couldn't control the language or where the creators were based, so I've been working on a desktop browser extension called **OriginFilter**.

It tries to filter clearly non-English written posts and video titles, and uses **explicit country information when available** to hide known non-US accounts. It also has keyword/account blocking, local learning of repeated posting languages, and a pause switch.

**It's still a beta.** A lot of accounts don't expose trustworthy country information (Facebook in particular), so I'm not claiming perfect US-only feeds. English filtering doesn't analyze video audio. I've tested the code on simulated feeds, but I need actual testers to see which websites still break.

It's free, open source, and needs no registration or paid hosting. Optional public YouTube lookups and optional labeled sponsorships are off by default. No paying sponsors are running.

**Public beta downloads:** https://github.com/rarediary/OriginFilter/releases/tag/v0.8.0

Chrome uses **Load unpacked** because it isn't in the store yet. Firefox uses **Load Temporary Add-on**, which stops working on restart until there's a signed listing. The GitHub README has the steps.

I would appreciate feedback on whether it installs, catches the posts you expected, causes false positives, or slows down scrolling. Please report at https://github.com/rarediary/OriginFilter/issues/1

I'm the developer of OriginFilter. It's independent of X, Meta and Google.

---

Status: **drafted in GitHub only, not submitted to Reddit.** Prefer releasing a signed browser extension before broad promotion if users hesitate to sideload development extensions.
