/* eslint-disable */
// @ts-ignore
import * as API from './types';

export function displayStatusEnum(field: API.StatusEnum) {
  return { leave: 'leave', absent: 'absent' }[field];
}
