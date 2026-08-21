---
mode: testing
timeout: 600
url: http://localhost:3001
---

# Everclaw chat - Hello

## Assert chat ready
Assert the textbox with placeholder 'Type a message' is visible.

## Send Hello
Fill the textbox with placeholder 'Type a message' with 'Hello from 1-everclaw-chat' and click the Send button.

## Wait and store reply
Wait for an assistant message to appear and store the assistant message text as 'assistant_reply'.
