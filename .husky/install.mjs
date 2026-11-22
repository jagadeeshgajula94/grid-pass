if (process.env.NODE_ENV !== "production" && !process.env.CI) {
  const { default: husky } = await import("husky");
  husky();
}
