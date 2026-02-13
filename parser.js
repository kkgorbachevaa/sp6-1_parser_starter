// @todo: напишите здесь код парсера

function parsePage() {
  const meta = {};

  // Язык страницы с тега html
  const html = document.querySelector("html");
  meta.language = html.getAttribute("lang").trim();

  // Заголовок страницы без названия сайта
  const fullTitle = document.querySelector("title").textContent.trim();
  const titleParts = fullTitle.split("—"); // разделяем строку по символу «—»
  meta.title = titleParts[0].trim(); // берем часть до символа «—»

  // Описание из meta-тега
  const descriptionTag = document.querySelector('meta[name="description"]');
  meta.description = descriptionTag.getAttribute("content").trim();

  // Ключевые слова из мета-тега и создаем массив, в котором триммим каждое слово
  const keywordsTag = document.querySelector('meta[name="keywords"]');
  const keywordsString = keywordsTag.getAttribute("content").trim(); // строка
  const keywordsArray = keywordsString.split(","); // массив строк, разделить по «,»

  meta.keywords = [];
  keywordsArray.forEach((word) => {
    meta.keywords.push(word.trim());
  });

  // Оpengraph-описание (мета-теги с ключами вида og:*)
  meta.opengraph = {};
  const ogTags = document.querySelectorAll('meta[property^="og:"]');
  ogTags.forEach((tag) => {
    const property = tag.getAttribute("property"); // ищем property
    const content = tag.getAttribute("content").trim(); // ищем content
    const key = property.replace('og:', ''); // убираем из property og, чтобы остался просто "title"
    meta.opengraph[key] = content;
  });

  meta.opengraph.title = meta.title; // исправляем 

  function getProduct() {
    const product = {};

    // Идентификатор товара в data-атрибуте первой секции на странице.
    const productSection = document.querySelector("section.product"); // Находим секцию товара
    product.id = productSection.getAttribute("data-id").trim(); // Берем значение data id

    // Массив фотографий.
    // На первой позиции должно быть изображение, которое выбрано по умолчанию сразу при открытии страницы. Каждый элемент массива должен включать в себя ссылку на полное изображение, миниатюру и альтернативный текст.
    const thumbnails = productSection.querySelectorAll(
      ".preview nav button img",
    ); // Находим все миниатюры
    product.images = [];

    // Проходим по каждой миниатюре
    thumbnails.forEach((img) => {
      const preview = img.getAttribute("src").trim(); // маленькая картинка
      const full = img.getAttribute("data-src").trim(); // большая картинка
      const alt = img.getAttribute("alt").trim(); // альтернативный текст

      product.images.push({
        preview: preview,
        full: full,
        alt: alt,
      });
    });

    // Статус лайка.
    // Чтобы его получить, нужно проверить наличие класса active у кнопки над основным изображением.
    const likeButton = productSection.querySelector(".preview figure .like");
    product.isLiked = likeButton.classList.contains("active"); // Проверяем есть ли класс active

    // Название товара — текст в h1-теге.
    // Помните, что h1 всегда только один на странице.
    const titleElement = productSection.querySelector("h1");
    product.name = titleElement.textContent.trim(); // Берем текст

    // Массивы бирок, категорий и скидок.
    // Под названием товара есть строка с разноцветными тегами.
    // Иногда их может не быть совсем, либо их ограниченное количество.
    // Цветами различаются типы тега, так что когда получите их все, их нужно будет распределить по отдельным нужным массивам.
    // Зелёный отвечает за категорию, синий — за бирку, красный — за скидку.
    product.tags = {
      category: [],
      label: [],
      discount: [],
    };

    // Находим все span внутри блока tags
    const tagElements = productSection.querySelectorAll(".tags span");
    tagElements.forEach((tag) => {
      const text = tag.textContent.trim();

      if (tag.classList.contains("green")) {
        product.tags.category.push(text);
      } else if (tag.classList.contains("blue")) {
        product.tags.label.push(text);
      } else if (tag.classList.contains("red")) {
        product.tags.discount.push(text);
      }
    });

    // прайс
    const priceBlock = productSection.querySelector(".price");
    const priceText = priceBlock.textContent.trim();
    const currencySymbol = priceText[0]; // Первый символ - это валюта
    // Валюта — символ перед товаром: $, € или ₽
    if (currencySymbol === "₽") {
      product.currency = "RUB";
    } else if (currencySymbol === "$") {
      product.currency = "USD";
    } else if (currencySymbol === "€") {
      product.currency = "EUR";
    }

    // Текущая цена — это текст блока БЕЗ span
    const oldSpan = priceBlock.querySelector("span"); // находим старую цену

    let currentText = priceBlock.textContent; // берем весь текст внутри блока
    if (oldSpan) {
      currentText = currentText.replace(oldSpan.textContent, ""); // убираем старую цену из текста
    }
    currentText = currentText.trim(); // убираем лишние пробелы
    const currentNumber = currentText.replace(/[^\d]/g, ""); // убираем все кроме цифр
    product.price = Number(currentNumber); // превращаем строку в число

    // Цена товара без скидки — зачёркнута часть цены.
    if (oldSpan) {
      const oldText = oldSpan.textContent.trim(); // берем текст внутри span
      const oldNumber = oldText.replace(/[^\d]/g, ""); // убираем все кроме цифр
      product.oldPrice = Number(oldNumber); // превращаем строку в число
    } else {
      // если старой цены нет
      product.oldPrice = product.price; // старая цена = текущая цена
    }

    // Размер скидки.
    // Если она есть, посчитайте разницу между ценами, если нет — укажите, что скидка 0%.
    const discountValue = product.oldPrice - product.price; // считаем разницу
    if (discountValue > 0) {
      // если разница больше нуля, значит скидка есть
      product.discount = discountValue; // перезаписываем
      const percent = (discountValue / product.oldPrice) * 100; // (скидка / старая цена) * 100
      product.discountPercent = percent.toFixed(2) + "%"; // делаем два знака после запятой через toFixed и добавляем знак %
    } else {
      // если скидки нет
      product.discount = 0; // ставим 0
      product.discountPercent = "0.00%";
    }

    // Свойства товара — объект с ключами и значениями.
    // В качестве ключей нужно взять строки слева, а в качестве значений — строки справа в каждой строчке.
    product.properties = {}; // создаем пустой объект, туда складываем пары
    const items = productSection.querySelectorAll(".properties li"); // берем все li в properties
    items.forEach((li) => {
      // пробегаемся по каждому li
      const spans = li.querySelectorAll("span"); // берем два span для каждой строки
      const key = spans[0].textContent.trim(); // ключ слева
      const value = spans[1].textContent.trim(); // значение справа
      product.properties[key] = value; // записываем в объект. Имя поля - key, значение - value
    });

    // Полное описание, скрытое под сворачиваемым блоком.
    // Оно состоит из нескольких отформатированных параграфов, то есть включает в себя произвольную html-разметку для форматирования текста.
    // Та часть описания, которая на сайте видна сразу, — это короткое описание.
    // Чтобы сохранить в объекте полное описание, нужно взять короткое описание плюс все что скрыто.
    // Не потеряйте форматирование, но убедитесь, что удалили с тегов все атрибуты.
    const descriptionElement = productSection.querySelector(".description"); // Ищем внутри товара description
    const descriptionClone = descriptionElement.cloneNode(true); // клонируем
    descriptionClone.querySelectorAll("*").forEach((el) => { // Удаляем все атрибуты у всех вложенных элементов. "*" - найти все элементы внутри
        Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
    });
    product.description = descriptionClone.innerHTML.trim(); // сохраняем оцищенный html

    return product;
}

  // Массив дополнительных товаров.
  // Здесь нужно получить все карточки и перебрать их в цикле, чтобы сформировать массив.
  const suggested = [];
  const suggestedCards = document.querySelectorAll(".suggested .items article"); // находим карточки
  suggestedCards.forEach((card) => {
    // достаем элементы внутри одной карточки
    const img = card.querySelector("img"); // картинка
    const title = card.querySelector("h3"); // название
    const priceEl = card.querySelector("b"); // цена вместе с валютой
    const desc = card.querySelector("p"); // описание

    const priceText = priceEl.textContent.trim(); // убираем пробелы
    const currencySymbol = priceText[0]; // берем первый символ строки

    let currency = ""; // создаем переменную куда положим код валюты
    if (currencySymbol === "₽") currency = "RUB"; // если первый символ Р, значит валюта rub
    if (currencySymbol === "$") currency = "USD";
    if (currencySymbol === "€") currency = "EUR";

    const priceNumber = priceText.replace(/[^\d]/g, ""); // удаляем все, что не цифра

    suggested.push({
      // добавляем новый объект в конец массива suggested
      image: img.getAttribute("src").trim(),
      name: title.textContent.trim(),
      price: priceNumber,
      currency: currency,
      description: desc.textContent.trim(),
    });
  });

  // Массив обзоров
  // Получите всё аналогично предыдущему блоку. В цикле переберите карточки, чтобы сформировать массив.
  const reviews = [];
  const reviewCards = document.querySelectorAll(".reviews .items article"); // находим все карточки отзывов

  // перебираем карточки и собираем данные
  reviewCards.forEach((card) => {
    const rating = card.querySelectorAll(".rating .filled").length; // рейтинг = количество заполненных звезд

    // заголовок и описание
    const titleEl = card.querySelector("h3.title");
    const descEl = card.querySelector("div p");

    // автор
    const authorImg = card.querySelector(".author img");
    const authorName = card.querySelector(".author span");

    // дата
    const dateEl = card.querySelector(".author i"); // находим элемент с датой
    const rawDate = dateEl.textContent.trim(); // берем текст даты
    const formattedDate = rawDate.replaceAll("/", "."); // меняем формат даты по заданию (заменяем символ / на .)

    reviews.push({
      // // добавляем новый объект в конец массива reviews
      rating: rating,
      author: {
        avatar: authorImg.getAttribute("src").trim(),
        name: authorName.textContent.trim(),
      },
      title: titleEl.textContent.trim(),
      description: descEl.textContent.trim(),
      date: formattedDate,
    });
  });

  return {
    meta: meta,
    product: getProduct(),
    suggested: suggested,
    reviews: reviews,
  };
}

window.parsePage = parsePage;