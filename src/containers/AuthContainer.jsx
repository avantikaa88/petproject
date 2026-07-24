import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import Auth from "../pages/Auth";
import api from "../api/axios";
import { mergeGuestCartIntoAccount } from "../utils/guestCart";

function AuthContainer() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // If the navbar's "Sign Up" button sent us here, open straight on the
  // Create Account form instead of the default Sign In form.
  const [isSignIn, setIsSignIn] = useState(location.state?.mode !== "signup");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    phone_number: "",
    address: "",
    gender: "",
    date_of_birth: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isSignIn && formData.password !== confirmPassword) {
      toast.error("Passwords do not match!");
      setIsLoading(false);
      return;
    }

    try {
      let response;

      if (isSignIn) {
        console.log("Login Data:", formData);

        response = await axios.post(
          "http://localhost:5000/api/auth/login",
          {
            email: formData.email,
            password: formData.password,
          }
        );
      } else {
        console.log("========== REGISTER ==========");
        console.log(formData);

        response = await axios.post(
          "http://localhost:5000/api/auth/register",
          formData
        );
      }

      console.log("Response:", response.data);

      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }

        if (response.data.user) {
          localStorage.setItem(
            "user",
            JSON.stringify(response.data.user)
          );

          // Anything added to the cart before signing in lives in
          // localStorage — now that we have a real account + token, push
          // those items into the database cart so they show up right away
          // in the user's cart/dashboard.
          await mergeGuestCartIntoAccount(api);

          if (response.data.user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/user");
          }
        }

        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("========== ERROR ==========");

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Response:", error.response.data);

        if (error.response.data.errors) {
          console.table(error.response.data.errors);

          const msg = error.response.data.errors
            .map((e) => e.msg || e.message)
            .join("\n");

          toast.error(msg);
        } else {
          toast.error(error.response.data.message || "Server error occurred");
        }
      } else if (error.request) {
        console.log("No Response:", error.request);
        toast.error("Backend server is not responding.");
      } else {
        console.log(error.message);
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Auth
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      isSignIn={isSignIn}
      setIsSignIn={setIsSignIn}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      formData={formData}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}

export default AuthContainer;