package deepseek

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"ds2api/internal/config"
	trans "ds2api/internal/deepseek/transport"
)

func (c *Client) postJSON(ctx context.Context, doer trans.Doer, url string, headers map[string]string, payload any) (map[string]any, error) {
	body, status, err := c.postJSONWithStatus(ctx, doer, url, headers, payload)
	if err != nil {
		return nil, err
	}
	if status == 0 {
		return nil, errors.New("request failed")
	}
	return body, nil
}

func (c *Client) postJSONWithStatus(ctx context.Context, doer trans.Doer, url string, headers map[string]string, payload any) (map[string]any, int, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, 0, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := doer.Do(req)
	if err != nil {
		config.Logger.Warn("[deepseek] fingerprint request failed, fallback to std transport", "url", url, "error", err)
		req2, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
		if reqErr != nil {
			return nil, 0, err
		}
		for k, v := range headers {
			req2.Header.Set(k, v)
		}
		resp, err = c.fallback.Do(req2)
		if err != nil {
			return nil, 0, err
		}
	}
	defer resp.Body.Close()
	payloadBytes, err := readResponseBody(resp)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	out := map[string]any{}
	if len(payloadBytes) > 0 {
		if err := json.Unmarshal(payloadBytes, &out); err != nil {
			config.Logger.Warn("[deepseek] json parse failed", "url", url, "status", resp.StatusCode, "content_encoding", resp.Header.Get("Content-Encoding"), "preview", preview(payloadBytes))
		}
	}
	return out, resp.StatusCode, nil
}

func (c *Client) getJSON(ctx context.Context, doer trans.Doer, url string, headers map[string]string) (map[string]any, error) {
	body, status, err := c.getJSONWithStatus(ctx, doer, url, headers)
	if err != nil {
		return nil, err
	}
	if status == 0 {
		return nil, errors.New("request failed")
	}
	return body, nil
}

func (c *Client) getJSONWithStatus(ctx context.Context, doer trans.Doer, url string, headers map[string]string) (map[string]any, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := doer.Do(req)
	if err != nil {
		config.Logger.Warn("[deepseek] fingerprint GET request failed, fallback to std transport", "url", url, "error", err)
		req2, reqErr := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if reqErr != nil {
			return nil, 0, err
		}
		for k, v := range headers {
			req2.Header.Set(k, v)
		}
		resp, err = c.fallback.Do(req2)
		if err != nil {
			return nil, 0, err
		}
	}
	defer resp.Body.Close()
	payloadBytes, err := readResponseBody(resp)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	out := map[string]any{}
	if len(payloadBytes) > 0 {
		if err := json.Unmarshal(payloadBytes, &out); err != nil {
			config.Logger.Warn("[deepseek] json parse failed", "url", url, "status", resp.StatusCode, "content_encoding", resp.Header.Get("Content-Encoding"), "preview", preview(payloadBytes))
		}
	}
	return out, resp.StatusCode, nil
}
