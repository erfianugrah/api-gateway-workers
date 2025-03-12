// Mock validation functions
export const isValidApiKey = jest.fn(key => key.startsWith("km_"));

export const validateCreateKeyParams = jest.fn(params => {
  if (!params.name) throw new Error("Name is required");
  if (!params.owner) throw new Error("Owner is required");

  return params;
});

export const validateApiKey = jest.fn().mockResolvedValue({
  valid: true,
  key: {
    id: "test-key-id",
    status: "active",
    scopes: ["read:data"],
  },
});
