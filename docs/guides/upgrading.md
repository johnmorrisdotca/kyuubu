---
title: Upgrading and coming from other libraries
section: upgrading
order: 10
description: Learn upgrading and coming from other libraries.
---

## Within version 1

This documentation rollout changes comments, guides and site navigation without changing the SDK's exported behavior. Keep imports from the named entry points. [Changelog](../../CHANGELOG.md) records version-specific additions; existing detailed Markdown references remain linked.

## Coming from another cube library

Translate its state representation deliberately: Kyuubu stores stickers in U, R, F, D, L, B order, not an array of cubie identities. Parse notation for the actual size and preserve whole-cube rotations in reconstructions. A beginner-method solution is not promised to be shortest. For cuboids, check slice legality rather than applying ordinary cube quarter turns.

## Choosing an integration

Use the core for state and notation, CubeView for a native browser view, the React entry for components and refs, the player for controls, and the element definition entry for HTML tags. Dispose directly mounted handles on removal. The docs search index is built locally with the site and adds no hosted service.

## Before releasing

Review newly written Japanese and compare the API examples with the installed package. Local documentation changes do not publish a package, change repository settings or upload a social preview.
