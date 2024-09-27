export let impersonatedUserId: string | null = null;

export function setImpersonatedUserId(userId: string | null) {
	impersonatedUserId = userId;
}
