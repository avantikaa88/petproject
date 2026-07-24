import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { toast } from "react-toastify";

export default function PaymentSuccess() {

    const [params] = useSearchParams();

    const navigate = useNavigate();

    useEffect(() => {

        const verify = async () => {

            const pidx = params.get("pidx");

            if (!pidx) {

                toast.error("Invalid payment.");

                navigate("/");

                return;

            }

            try {

                await api.post("/payment/verify", {

                    pidx

                });

                toast.success("Payment Successful.");

                navigate("/user");

            } catch (err) {

                console.log(err);

                toast.error("Payment verification failed.");

                navigate("/");

            }

        };

        verify();

    }, []);

    return (

        <h2 style={{textAlign:"center",marginTop:"100px"}}>

            Verifying Payment...

        </h2>

    );

}