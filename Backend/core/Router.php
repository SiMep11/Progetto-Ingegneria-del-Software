<?php
class Router {
    private array $routes = [];

    public function add(string $method, string $pattern, array $handler): void {
        $this->routes[] = compact('method', 'pattern', 'handler');
    }

    public function dispatch(string $method, string $uri): void {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $route['pattern']);

            if (preg_match('#^' . $pattern . '$#', $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                [$class, $method_name] = $route['handler'];
                $class::$method_name($params);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Endpoint non trovato']);
    }
}
