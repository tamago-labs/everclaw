## How was onboarding?

I didn’t notice the onboarding flow from the landing page. I initially tried integrating Jupiter using the Solana Agent Kit source code, but it failed. Later, I checked the Jupiter docs and realized I needed to use v2 with an API key. After that, I created an account and used the new endpoint and API key from there.

## What’s broken or missing in the docs?

As a newcomer to Jupiter, I found this page confusing:
https://developers.jup.ag/docs/swap/migration/metis-to-build

At first, I didn’t understand what “Metis” meant, until I later realized it refers to v1.

## Where did the APIs bite you?

The API was quite smooth—there were no errors during integration. I tried multiple times today, mostly copying from the docs and letting AI generate the integration code. It worked on the first attempt.

## Did you use the AI stack?

We didn’t directly use the AI stack tools like MCP, CLI, or Skills. Instead, we read the docs manually and copied only the relevant parts to AI to generate code. We didn’t feed the full documentation because that often led to mistakes.

## How would you rebuild developers.jup.ag?

The UX/UI is quite good. I mainly used it for swap functionality, but I’m looking forward to exploring and integrating more services in the future.

## What do you wish existed?

I used the solana-agent-kit. The repository is still active, but it still uses v1. When I tried to swap, it failed. I think we can still get quotes from v1, but swapping is no longer supported. I see a potential issue where v1 is still partially supported, while developers are expected to keep the agent kit up to date. I’m not entirely sure which approach is better, but the documentation could definitely be clearer.