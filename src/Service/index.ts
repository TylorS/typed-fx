import { Tagged } from '@/Tagged/index'

export type Service<S> = Tagged<{ readonly Service: Service<S> }, symbol>
export const Service = <S>(name: string) => Tagged<Service<S>>()(Symbol(name))
