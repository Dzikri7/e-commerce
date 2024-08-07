import React, { useState, useEffect } from "react";
import Layout from "./../components/Layout/Layout";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";
import { useNavigate } from "react-router-dom";
import DropIn from "braintree-web-drop-in-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Modal } from "antd";
import "../styles/CartStyles.css";

const CartPage = () => {
  const [auth] = useAuth();
  const [cart, setCart] = useCart();
  const [clientToken, setClientToken] = useState("");
  const [instance, setInstance] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const navigate = useNavigate();

  //total price
  const totalPrice = () => {
    try {
      let total = 0;
      cart?.map((item) => {
        total += item.price;
        return total;
      });
      return total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
    } catch (error) {
      console.log(error);
    }
  };

  //delete item from cart
  const removeCartItem = (pid) => {
    try {
      setDeleteItemId(pid);
      setConfirmDeleteVisible(true);
    } catch (error) {
      console.log(error);
    }
  };

  const handleConfirmDelete = () => {
    try {
      let myCart = [...cart];
      let index = myCart.findIndex((item) => item._id === deleteItemId);
      myCart.splice(index, 1);
      setCart(myCart);
      localStorage.setItem("cart", JSON.stringify(myCart));
      toast.success("Item removed successfully");
      setConfirmDeleteVisible(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteVisible(false);
  };

  //get payment gateway token
  const getToken = async () => {
    try {
      const { data } = await axios.get("http://localhost:8080/api/v1/product/braintree/token");
      setClientToken(data?.clientToken);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getToken();
  }, [auth?.token]);

  //handle payments
  const handlePayment = async () => {
    try {
      setLoading(true);
      const { nonce } = await instance.requestPaymentMethod();
      const { data } = await axios.post("http://localhost:8080/api/v1/product/braintree/payment", {
        nonce,
        cart,
      });
      setLoading(false);
      localStorage.removeItem("cart");
      setCart([]);
      navigate("/dashboard/user/orders");
      toast.success("Payment Completed Successfully");
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="cart-page">
        <div className="row">
          <div className="col-md-12 greeting-container">
            <h1 className="bg-light p-2 mb-1">
              {!auth?.user
                ? "Hello Guest"
                : `Hello ${auth?.token && auth?.user?.name}`}
              <p>
                {cart?.length
                  ? `You Have ${cart.length} items in your cart ${
                      auth?.token ? "" : "please login to checkout !"
                    }`
                  : "Your Cart Is Empty"}
              </p>
            </h1>
          </div>
        </div>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-7 p-0 m-0">
              {cart?.map((p) => (
                <div className="row card flex-row mb-3 shadow-sm" key={p._id}>
                  <div className="col-md-4">
                    <img
                      src={`http://localhost:8080/api/v1/product/product-photo/${p._id}`}
                      className="card-img-top img-fluid"
                      alt={p.name}
                    />
                  </div>
                  <div className="col-md-4 d-flex flex-column justify-content-center">
                    <h5>{p.name}</h5>
                    <p>{p.description?.substring(0, 30)}</p>
                    <p className="fw-bold">Price: ${p.price}</p>
                  </div>
                  <div className="col-md-4 d-flex align-items-center justify-content-center">
                    <button
                      className="btn btn-danger"
                      onClick={() => removeCartItem(p._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="col-md-5 cart-summary p-4 bg-light shadow-sm rounded">
              <h2>Cart Summary</h2>
              <p>Total | Checkout | Payment</p>
              <hr />
              <h4>Total: {totalPrice()}</h4>
              {auth?.user?.address ? (
                <div className="mb-3">
                  <h4>Current Address</h4>
                  <h5>{auth?.user?.address}</h5>
                  <button
                    className="btn btn-outline-warning"
                    onClick={() => navigate("/dashboard/user/profile")}
                  >
                    Update Address
                  </button>
                </div>
              ) : (
                <div className="mb-3">
                  {auth?.token ? (
                    <button
                      className="btn btn-outline-warning"
                      onClick={() => navigate("/dashboard/user/profile")}
                    >
                      Update Address
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline-warning"
                      onClick={() =>
                        navigate("/login", {
                          state: "/cart",
                        })
                      }
                    >
                      Please Login to checkout
                    </button>
                  )}
                </div>
              )}
              <div className="mt-2">
                {!clientToken || !auth?.token || !cart?.length ? (
                  ""
                ) : (
                  <>
                    <DropIn
                      options={{
                        authorization: clientToken,
                        paypal: {
                          flow: "vault",
                        },
                      }}
                      onInstance={(instance) => setInstance(instance)}
                    />
                    <button
                      className="btn btn-primary w-100"
                      onClick={handlePayment}
                      disabled={loading || !instance || !auth?.user?.address}
                    >
                      {loading ? "Processing ...." : "Make Payment"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="Confirm Delete"
        visible={confirmDeleteVisible}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText="Yes"
        cancelText="No"
      >
        <p>Are you sure you want to remove this item from your cart?</p>
      </Modal>
    </Layout>
  );
};

export default CartPage;
