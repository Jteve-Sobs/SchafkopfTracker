export async function getVersion() {
  try {
    const response = await fetch("/version.json");
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error("Failed to fetch version:", error);
    return "unknown"; // Fallback if fetching fails
  }
}
