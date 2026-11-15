export const serializeSaasProduct = (document) => {
  const product = document.toObject ? document.toObject() : document;
  return {
    ...product,
    signupBountyAmount: product.signupBountyAmount?.toString?.() || '0',
    planTiers: (product.planTiers || []).map((tier) => ({
      ...tier,
      commissionValue: tier.commissionValue?.toString?.() || '0',
    })),
  };
};

export const serializeWithdrawal = (document) => {
  const withdrawal = document.toObject ? document.toObject() : document;
  return { ...withdrawal, amount: withdrawal.amount?.toString?.() || '0' };
};
