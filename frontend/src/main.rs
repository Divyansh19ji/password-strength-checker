// frontend/src/main.rs
use yew::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};
use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
struct CheckResult {
    entropy: f64,
    percentage: u8,
    level: String,
    leaked: bool,
}

#[function_component(App)]
fn app() -> Html {
    let password = use_state(|| String::new());
    let result = use_state(|| None as Option<CheckResult>);
    let loading = use_state(|| false);

    let on_input = {
        let password = password.clone();
        Callback::from(move |e: InputEvent| {
            let input: HtmlInputElement = e.target_unchecked_into();
            password.set(input.value());
        })
    };

    let on_check = {
        let password = password.clone();
        let result = result.clone();
        let loading = loading.clone();
        Callback::from(move |_| {
            let pw = (*password).clone();
            if pw.is_empty() {
                result.set(None);
                return;
            }
            loading.set(true);
            wasm_bindgen_futures::spawn_local(async move {
                let mut opts = RequestInit::new();
                opts.method("POST");
                opts.mode(RequestMode::Cors);
                let body = JsValue::from_serde(&serde_json::json!({"password": pw})).unwrap();
                opts.body(Some(&body));
                let request = Request::new_with_str_and_init("/api/check", &opts).unwrap();
                request.headers().set("Content-Type", "application/json").unwrap();
                let window = web_sys::window().unwrap();
                let resp_value = JsFuture::from(window.fetch_with_request(&request)).await.unwrap();
                let resp: Response = resp_value.dyn_into().unwrap();
                let json = JsFuture::from(resp.json().unwrap()).await.unwrap();
                let chk: CheckResult = json.into_serde().unwrap();
                result.set(Some(chk));
                loading.set(false);
            });
        })
    };

    html! {
        <div class="container">
            <h1>{"🔐 Password Strength Checker"}</h1>
            <input type="password" placeholder="Enter password"
                {on_input} value={(*password).clone()} class="pw-input" />
            <button onclick={on_check} disabled={*loading}>{ if *loading { "Checking…" } else { "Check" } }</button>
            {
                if let Some(res) = (*result).clone() {
                    html! {
                        <div class="result">
                            <div class="bar-wrapper">
                                <div class="bar" style={format!("width: {}%;", res.percentage)}></div>
                            </div>
                            <p>{format!("Score: {} %", res.percentage)}</p>
                            <p>{format!("Entropy: {:.2} bits", res.entropy)}</p>
                            <p>{format!("Level: {}", res.level)}</p>
                            if res.leaked {
                                <p class="warning">{"⚠️ This password appears in known leak lists!"}</p>
                            }
                        </div>
                    }
                } else {
                    html! {}
                }
            }
        </div>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}

