---
title: 'La respuesta es ahora el producto'
subtitle: 'Encontrar vulnerabilidades se ha abaratado. Lo que deberían mirar ahora los clientes es qué pasa después, y a qué velocidad.'
summary: 'La IA ha abaratado encontrar bugs para todo el mundo a la vez. Lo que no se ha abaratado es responder: saber qué distribuyes, tener una puerta por la que recibir reportes, hacer llegar el parche a quienes ejecutan tu código. Desde septiembre, el Reglamento de Ciberresiliencia lo pone contra el reloj.'
coverAlt: 'Dos robots de combate idénticos, uno rojo y otro blanco, frente a frente con los puños en alto.'
---

## El dilema de la IA

Hay una pregunta que me hacen mucho, normalmente quienes saben que llevo un tiempo en esto:

¿es el mundo menos seguro ahora, con la IA?

Mi respuesta no ha cambiado. La IA es una herramienta, y atacantes y defensores usan exactamente la misma. Es como en las películas de mechas: aparece un monstruo gigante para arrasar una ciudad y siempre hay un robot gigante, del mismo tamaño, que le planta cara. Misma herramienta, mismas capacidades en los dos bandos. Lo que marca la diferencia es el piloto. Yo lo llamo el dilema de la IA (_the AI conundrum_).[^1]

Dejemos de lado la nueva superficie de ataque, los modelos y los propios sistemas de IA, que es un problema real pero distinto. Los ataques vienen de los mismos sitios y funcionan igual que siempre: un correo de phishing, una contraseña reutilizada, una librería sin parchear, un servidor olvidado. Lo que ha cambiado es quién los ejecuta. Una máquina, no una persona, y a la velocidad de una máquina. Todo es como antes de la IA, pero a la velocidad de la luz.

## Descubrir se ha abaratado

En mi anterior empresa construimos una herramienta que encontraba vulnerabilidades en plugins de WordPress. No era triaje. Era descubrimiento. Comparaba código con un corpus de vulnerabilidades y pruebas de concepto (PoC) que ya teníamos, y una persona revisaba cada resultado, porque los falsos positivos llegaban seguros de sí mismos, bien redactados... e imposibles de reproducir. Funcionaba, más o menos. Encontraba bugs reales.[^2]

La lección que saqué no tenía que ver con la herramienta. Era más simple: si un equipo de tres personas pudo construir eso, cualquiera con un corpus parecido y un fin de semana libre puede hacerlo. Y lo más probable es que algunos no estén de tu lado.

Durante veinte años, lo difícil y caro de la seguridad del software era encontrar el bug. Buena parte de lo que llamamos seguridad se construyó sobre esa economía: hacer que encontrar y explotar el fallo costara lo bastante como para que la mayoría de los atacantes se fueran a molestar a otro. Eso es lo que pagó a los investigadores, los bug bounty y los pentest, y por eso la seguridad por oscuridad funcionó más tiempo del que nadie quiere admitir. Ya no funciona. Encontrar se ha abaratado, para todos a la vez, y una defensa basada en el coste se hunde en consecuencia.

Lo que no se ha abaratado es lo que ocurre después de que alguien encuentre algo en tu código o en tu infraestructura: la respuesta.

## Qué significa "responder" de verdad

Responder son estas tres preguntas, por orden:

- **¿Con qué rapidez te enteras?**
- **¿Con qué rapidez decides qué es?**
- **¿Con qué rapidez llega el parche a quienes ejecutan realmente tu código?**

Pasé años construyendo los pipelines y las herramientas de una operación de divulgación que gestionaba miles de reportes al año. Y, sorpresa, donde se atascaban casi nunca era en el exploit. Era que nadie contestaba el correo. O que alguien contestaba y luego tenía que preguntar a ingeniería qué producto llevaba siquiera esa librería. O que el parche salía y la mayor parte de la base instalada nunca lo aplicaba.

Así que la lista práctica es corta y poco vistosa:

- **Saber qué distribuyes.** Hasta la librería incluida tres niveles más abajo que ningún manifiesto lista.
- **Ponerle una puerta al edificio.** Un contacto de seguridad y una política publicada, porque los investigadores que no encuentran la puerta entran por la ventana, o lo hacen público.
- **Decir en voz alta cuándo dejas de mantener algo.**
- **Entregar el parche de forma que la gente lo instale.** Un parche que nadie aplica no es un parche, es un anuncio de dónde estaba el bug.

Nada de esto es difícil de ingeniería. Es difícil de organización. Alguien tiene que ser responsable de contestar a "qué hay en nuestro software", y alguien tiene que ser responsable del reloj.

## El contrato

Desde el 11 de septiembre de 2026 las obligaciones de notificación del Reglamento de Ciberresiliencia (CRA) de la UE se aplican a los fabricantes: 24 horas para una alerta temprana de una vulnerabilidad explotada activamente, 72 horas para la notificación y 14 días para el informe final, una vez que existe un parche o una mitigación. A partir de diciembre de 2027 llega el resto, incluida una lista de materiales de software (SBOM) legible por máquina que cubra, como mínimo, las dependencias de primer nivel.

![El reloj de notificación del CRA: alerta temprana en 24 horas y notificación en 72 horas desde que se tiene conocimiento; informe final en 14 días desde que hay parche o mitigación. En vigor desde el 11 de septiembre de 2026; el resto, incluida la SBOM, desde el 11 de diciembre de 2027.](../../images/writing/cra-reporting-clock.svg)

Fíjate en lo que pide el reglamento. No pide código perfecto.

Pide darte cuenta, y decirlo, contra reloj.

Aquí es donde las SBOM dejan de ser un entregable de cumplimiento.[^3] La mayoría de las que he visto se generan a partir de un manifiesto de paquetes, es decir, listan lo que el desarrollador declaró, no lo que contiene el build. En el CloudFest Hackathon del año pasado construimos una herramienta de SBOM agnóstica del CMS precisamente porque los lectores de manifiestos se dejaban los includes y el código vendorizado y empaquetado, que es donde viven los bugs viejos.

La pregunta útil sobre una SBOM no es "¿tenemos una?". Es: cuando salga el próximo Log4j, ¿puede alguien decir en menos de una hora cuáles de nuestros productos lo incluyen y qué clientes ejecutan qué versión? Si la respuesta es un PDF en una unidad compartida, tienes un documento, no una capacidad.

## La respuesta es ahora el producto

Antes los clientes compraban software dando por hecho que era seguro, o pedían un informe de pentest una vez al año. Ahora el cuestionario llega antes que el contrato, y la pregunta de fondo no es "¿has encontrado todos tus bugs?". Nadie lo ha hecho. Es: cuando se encuentra algo, ¿qué pasa y con qué rapidez? Y el cuestionario tampoco es mera curiosidad. Es la responsabilidad bajando por la cadena, algo que merece un artículo aparte.

Eso convierte la respuesta a vulnerabilidades en una característica del producto. Es visible, es comparable entre proveedores y, desde este otoño, corre contra un reloj regulatorio. Los equipos que la traten como un trabajo secundario de la persona de seguridad perderán contratos frente a los que la traten como parte de lo que venden.

![Un karateka con gi blanco ejecutando una patada alta, a contraluz sobre el suelo oscuro de un dojo.](../../images/writing/the-pilot.jpg)

Nadie te preguntará si tu código es perfecto. Te preguntarán qué haces cuando no lo es, y comprobarán el reloj.

El robot es del mismo tamaño en los dos bandos. Lo que deberían mirar es al piloto: quien se hace cargo de la respuesta, y de las decisiones, cuando ese reloj empieza a correr.

[^1]: El mismo argumento, antes de la ola actual de modelos: [AI in the Hacking world war](/es/speaking/wceu-2020-ai-hacking-world-war/), WordCamp Europe 2020.

[^2]: El relato completo de esa herramienta, incluido lo que nunca llegó a conseguir: [We Built an AI That Finds Vulnerabilities in Plugins. So Can Everyone Else.](/es/speaking/kozhikode-2026-ai-finds-vulnerabilities/), WP Future Conclave, septiembre de 2026. Este artículo es su versión escrita.

[^3]: El ciclo de vida desde el bug hasta el parche, con el CRA de fondo: [De la Plantà a la Cremà](/es/speaking/valencia-meetup-2025-ciclo-vida-vulnerabilidades/), WordPress Meetup Valencia, abril de 2025 (en castellano).
