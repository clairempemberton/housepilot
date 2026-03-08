export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    // Call ChatGPT integration
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/chat-gpt/conversationgpt4`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ChatGPT API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Extract the assistant's message from the response
    const assistantMessage =
      data.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    return Response.json({
      message: assistantMessage,
      fullResponse: data,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to process chat request", details: error.message },
      { status: 500 },
    );
  }
}
