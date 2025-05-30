export default function TestApp() {
  console.log("TestApp component is executing");
  
  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "red", 
      color: "white", 
      padding: "20px",
      fontSize: "24px"
    }}>
      <h1>BASIC TEST - React Working</h1>
      <p>This is a minimal test component</p>
    </div>
  );
}