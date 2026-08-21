---
mode: testing
timeout: 600
url: http://localhost:3001/agents
---

# Everclaw agent add/remove

## Assert agents page
Assert the page contains 'Agents' and assert the 'New Agent' button is visible.

## Create Alex
Click the 'New Agent' button, fill the Name field with 'Alex-e2e-test', fill the Description field with 'e2e smoke Alex', fill the System prompt field with 'Your name is Alex. You are a concise, analytical assistant. Be accurate and helpful. Keep replies short, direct, and no-nonsense. No lah.', click the 'Create' button, assert the left list contains 'Alex-e2e-test' and store the agent name as 'agent_name'.

## Delete Alex
Go to http://localhost:3001/agents, click the card 'Alex-e2e-test' to select it, click the 'Delete' button in the Overview, click the 'Delete' button in the confirmation modal, assert the card 'Alex-e2e-test' is not visible.
