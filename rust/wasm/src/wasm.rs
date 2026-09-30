#[cfg(target_arch = "wasm32")]
mod compositor;
#[cfg(target_arch = "wasm32")]
mod effects;
#[cfg(target_arch = "wasm32")]
mod gpu;
#[cfg(target_arch = "wasm32")]
mod masks;
#[cfg(target_arch = "wasm32")]
mod perf;

#[cfg(target_arch = "wasm32")]
pub use compositor::*;
#[cfg(target_arch = "wasm32")]
pub use effects::*;
#[cfg(target_arch = "wasm32")]
pub use gpu::*;
#[cfg(target_arch = "wasm32")]
pub use masks::*;
#[cfg(target_arch = "wasm32")]
pub use perf::*;
pub use time::*;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::wasm_bindgen;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn start() {
    // Empty start function to ensure __wbindgen_start is exported
}
