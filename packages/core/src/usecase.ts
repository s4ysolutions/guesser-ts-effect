export interface UseCaseCommand<Response> {
  readonly "~response"?: Response
}

export type ResponseOf<C> = C extends UseCaseCommand<infer R> ? R : never

export interface UseCase<C extends UseCaseCommand<unknown>> {
  (command: C): ResponseOf<C>
}
