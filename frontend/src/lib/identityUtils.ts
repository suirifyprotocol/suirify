export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export const calculateDaysUntilExpiry = (expiryMs: string | number): number => {
  const expiry = typeof expiryMs === "string" ? parseInt(expiryMs) : expiryMs;
  const delta = Math.max(0, expiry - Date.now());
  return Math.ceil(delta / (24 * 60 * 60 * 1000));
};

export const exportVerificationProof = async (): Promise<string> => {
  // Stub: in a real app, this would generate a zk proof or signature
  await new Promise((r) => setTimeout(r, 800));
  return "Proof_0xDEMO";
};
