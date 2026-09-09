import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import FilteredProducts from "./pages/FilteredProducts";
import OrdersList from "./pages/OrdersList";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<FilteredProducts />} />
          <Route path="orders" element={<OrdersList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
