export const getOpenAiAppsChallenge = () => {
  return (
    process.env.OPENAI_APPS_CHALLENGE ||
    process.env.OPENAI_APPS_CHALLENGE_TOKEN ||
    process.env.OPENAI_APP_VERIFICATION ||
    ""
  ).trim();
};
