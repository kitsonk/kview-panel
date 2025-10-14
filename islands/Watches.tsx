export default function Watches() {
  return (
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Watches</h1>
      <p>This is the Watches island component.</p>
      <button
        type="button"
        onClick={(evt) => {
          evt.preventDefault();
          console.log("clicked!");
        }}
      >
        Button
      </button>
    </div>
  );
}
