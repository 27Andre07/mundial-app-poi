# Usa la imagen oficial de PHP que ya incluye un servidor Apache
FROM php:8.2-apache

# Instala la extensión 'mysqli' que tu código PHP necesita para conectar a la base de datos
RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

# Copia todos los archivos de tu proyecto a la carpeta pública del servidor
COPY . /var/www/html/