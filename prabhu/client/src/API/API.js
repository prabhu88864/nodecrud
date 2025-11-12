import axios from "axios";
import { STATUS_CODE, BASE_URL } from "./Constants";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';




// Request Methods
const METHOD = {
  GET: "get",
  POST: "post",
  PUT: "put",
  DELETE: "delete",
};
/*
* API controller that for handling the request
*/
class API {
  isLoggedIn = false;
  userData = {};
  userToken = null;
  constructor() {
    this.baseURL = BASE_URL;
  }
  get(url, data) {
    return new Promise((resolve, reject) => {
      this.api(METHOD.GET, url, data)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }
  post(url, data) {
    return new Promise((resolve, reject) => {
      this.api(METHOD.POST, url, data)
        .then((response) => {
          resolve(response);
          // console.log('response',response);
        })
        .catch((error) => {
          // console.log(error);
        });
    });
  }
  put(url, data) {
    return new Promise((resolve, reject) => {
      this.api(METHOD.PUT, url, data)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          // console.log(error);
        });
    });
  }
  delete(url, data) {
    return new Promise((resolve, reject) => {
      this.api(METHOD.DELETE, url, data)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }
  // Main function with hold the axios request param
  api(method, url, data) {
    console.log('method, url, data', method, url, data)
    return new Promise((resolve, reject) => {
      let axiosConfig = {};
      axiosConfig.method = method;
      axiosConfig.url = this.baseURL + url;
      axiosConfig.headers = this.setHeaders(data);
      //  console.log("axiosConfig.headers", axiosConfig.headers);
      if (data) {
        // if (data) axiosConfig.params = data;
        if (data) axiosConfig.data = data;
      }

      axios(axiosConfig)
        .then((response) => {
          if (
            response &&
            response.status === STATUS_CODE.INTERNAL_SERVER_ERROR
          ) {
            // toast.error("Something went wrong!!");
            alert("Something went wrong!!");
          } else {
            // resolve(response.data);  
            resolve(response);
            if (response) {
              console.log('Response:', response); // Check full response structure
              const successMessage = response.data?.messages;
              console.log('Success message:', successMessage);
              if (successMessage) {
                toast.success(successMessage);
              } else {
                console.log('No success message found');
              }
            }
          }
        })
        .catch((error) => {
          let err = error?.response;
          let errData = error?.response?.data;
          console.log("in API",err)
          console.log("in API",errData)
          console.log("ERROR", error);
          if (
            error.response.data?.email &&
            error.response.data.email.length > 0
          ) {
            toast.error(`Email ${error.response.data.email[0]}`);
          } else if (
            error.response.data?.phone_number &&
            error.response.data.phone_number.length > 0
          ) {
            toast.error(`Mobile Number ${error.response.data.phone_number[0]}`);
          } else if (
            error.response.data.message &&
            error.response.data.message.length > 0
          ) {
            toast.error(`${error.response.data.messages}`);
          } else if (err?.status === 401) {
            toast.error(`${errData.errors}`);
          } else if (err?.status === 422) {
            toast.error(`${error.response.data.errors}`);
          } else {
            toast.error("An error occurred");
          }
      
          // alert(errData?.messages)
        });
    });
  }
  // Set the header for request
  setHeaders(data) {
    let headers = {};
    headers["accept-language"] = "en";
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
    headers["Authorization"] = localStorage.getItem("token");
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (data) {
      if (data.isMultipart) {
        headers["Content-Type"] = "multipart/form-data";
      }
      if (data.headers) {
        for (var key in data.headers) {
          if (data.headers.hasOwnProperty(key)) {
            headers[key] = data.headers[key];
          }
        }
      }
    }
    return headers;
  }
}
export default API;