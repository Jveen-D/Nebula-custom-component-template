import axios from 'axios'
// import { Modal, message } from 'antd';

axios.create({
    baseURL: '',
})

function getCookie(name) {
    let arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    arr = document.cookie.match(reg)
    return arr ? unescape(arr[2]) : null;
}

// 添加请求拦截器
axios.interceptors.request.use((config) => {
    let cookie = getCookie('Authorization')
    let token = cookie || localStorage.getItem("token")
        // console.log(axios)
        // debugger
        // 在发送请求之前做些什么
    if (token) {
        config.headers['Authorization'] = 'bearer '+token;
    }

    return config;
}, (error) => {
    // 对请求错误做些什么
    return Promise.reject(error);
});

// 添加响应拦截器
axios.interceptors.response.use((response) => {
    // console.log(response)
    if (response.data) {
        //  window.location.hash = '/login?href=22222'
    }
    return response.data
}, (error) => {
    // 对响应错误做点什么
    return Promise.reject(error);
});

export default axios