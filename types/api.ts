export interface ApiResponse<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}
