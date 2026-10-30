FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite \
    && mkdir -p /var/www/.vscode-server \
    && chown -R www-data:www-data /var/www/.vscode-server

COPY apache.conf /etc/apache2/sites-available/000-default.conf
