import type { Task, UserProfile } from '../types';

/** Defaults only to the authenticated, active creator; never an impersonated profile. */
export function defaultTaskAssignee(
  initialTask: Pick<Task, 'assigneeId'> | null | undefined,
  authenticatedProfile: Pick<UserProfile, 'uid' | 'status'> | null | undefined,
  users: readonly Pick<UserProfile, 'uid' | 'status'>[],
): string {
  if (initialTask) return initialTask.assigneeId || '';
  if (!authenticatedProfile?.uid || authenticatedProfile.status !== 'active') return '';
  return users.some(user => user.uid === authenticatedProfile.uid && user.status === 'active')
    ? authenticatedProfile.uid : '';
}
