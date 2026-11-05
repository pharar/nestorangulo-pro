---
summary: 'Descubrir vulnerabilidades con ayuda de máquinas ya es barato para todo el mundo, atacantes incluidos. El cuello de botella ya no es el descubrimiento, sino la respuesta.'
sourceNote: 'Impartida en remoto para la sala de Kozhikode.'
---

Un informe de campo sobre la construcción de un sistema que caza variantes de vulnerabilidades en plugins de WordPress: qué era en realidad (una capa de recuperación sobre un corpus de vulnerabilidades y pruebas de concepto reales, prompting estructurado, revisión adversarial y una persona al final), qué funcionó y qué no logró hacer nunca. La conclusión honesta es la incómoda: nada de esa pila es exclusivo, así que cualquiera puede construirla, también los atacantes.

Eso cambia cuál es la pregunta importante. Con más de 4.100 CVE publicados solo en 2024 en el ecosistema de WordPress, el descubrimiento ha dejado de ser el cuello de botella; lo es la respuesta. La charla replantea el problema en torno a tres relojes —lo rápido que _te enteras_, lo rápido que _decides_ y lo rápido que _publicas_— y propone cinco prácticas para acelerarlos: saber qué distribuyes, dejar una puerta abierta a quienes reportan vulnerabilidades, vigilar tus dependencias, declarar un periodo de soporte y ser capaz de publicar versiones con rapidez.

Termina explicando por qué esto deja de ser opcional: las obligaciones de notificación del Reglamento de Ciberresiliencia de la UE, con sus plazos de 24 horas, 72 horas y 14 días, y la manera en que las normas europeas viajan a través de los contratos hasta mercados que nunca votaron por ellas.

> _Traducción al español, ofrecida por accesibilidad. Esta charla se impartió en inglés; el resumen original aparece a continuación. La traducción puede contener errores._

**Original (English)**

A field report from building a system that hunts vulnerability variants in WordPress plugins: what it actually was (a retrieval layer over a corpus of real vulnerabilities and proof-of-concepts, structured prompting, adversarial review, and a human at the end), what worked, and what it never managed to do. The honest conclusion is the uncomfortable one — nothing in that stack is exclusive, so anyone can build it, attackers included.

That changes which question matters. With more than 4,100 CVEs published in the WordPress ecosystem in 2024 alone, discovery has stopped being the bottleneck; response is. The talk reframes the problem around three clocks — how fast you _know_, how fast you _decide_, and how fast you _ship_ — and lays out five practices that move them: know what you ship, keep a door open for reporters, watch your dependencies, declare a support period, and be able to release quickly.

It closes on why this stops being optional: the EU Cyber Resilience Act's reporting duties, with their 24-hour, 72-hour and 14-day clocks, and the way European rules travel through contracts into markets that never voted on them.
