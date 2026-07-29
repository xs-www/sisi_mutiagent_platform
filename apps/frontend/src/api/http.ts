import axios from 'axios';
import { message } from 'antd';

export const http = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      message.error('请先登录');
    } else if (status === 403) {
      message.error('无权限访问');
    } else if (status === 404) {
      message.error('请求的资源不存在');
    } else if (status === 500) {
      message.error(data?.error || '服务器内部错误');
    } else {
      message.error(data?.error || error.message || '请求失败');
    }

    return Promise.reject(error);
  }
);
