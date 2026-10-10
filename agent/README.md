# Configure Mat

1. Create an ElevenLabs Agent and select a voice. Paste `prompt.md` as its prompt.
2. Configure dynamic variables `workout_context`, `coaching_style`, `user_name` (provided by the app).
3. Add three **client** tools matching `tools.json`. Make each tool block/wait for its response so the agent cannot assume success.
4. Keep authentication enabled. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in the backend environment only.
5. Start backend with its environment file and connect from a browser on localhost.

Provider configuration and a real live conversation still require validation. No agent or voice is provisioned automatically by this repository. Stage 1 works without provider credentials.
