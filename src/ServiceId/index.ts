import { Tagged } from '@/Tagged/index'

export type ServiceId<S> = Tagged<{ readonly ServiceId: S }, symbol>

export const ServiceId = <S>(name: string) => Tagged<ServiceId<S>>()(Symbol(name))
