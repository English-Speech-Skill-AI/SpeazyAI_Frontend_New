
# EnglishSkillAI

This is a code bundle for EnglishSkillAI. The original project is available at https://www.figma.com/design/5EZd4fPq54udQcS9aT80rX/EnglishSkillAI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  ## Proxy Servers

  For local development, you need to run proxy servers for API integrations:

  ### Speech Assessment Proxy (Port 4000)
  ```bash
  npm run proxy:speech
  ```
  Requires `LC_API_KEY` in your `.env` file.

  ### ChatGPT Proxy (Port 4001)
  ```bash
  npm run proxy:chatgpt
  ```
  Requires `OPENAI_API_KEY` in your `.env` file.

  ### Environment Variables
  Create a `.env` file in the root directory with:
  ```
  LC_API_KEY=your_language_confidence_api_key
  OPENAI_API_KEY=your_openai_api_key
  ```
  Test