import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
 return {
   username: locals.user.name ?? `trader${locals.user.id}`
 }
};
